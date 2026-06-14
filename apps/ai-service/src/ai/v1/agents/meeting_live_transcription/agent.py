"""LiveKit room audio to OpenAI Realtime transcription worker."""

import asyncio
import base64
import contextlib
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any

import httpx
from livekit import rtc
from websockets.asyncio.client import connect
from websockets.exceptions import ConnectionClosedOK

from src.core.config import settings

logger = logging.getLogger(__name__)

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime"
OPENAI_AUDIO_COMMIT_INTERVAL_SECONDS = 2.5


@dataclass
class LiveMeetingStart:
    org_id: str
    room_id: str
    room_name: str
    livekit_ws_url: str
    livekit_token: str
    model: str | None = None


@dataclass
class LiveMeetingSession:
    payload: LiveMeetingStart
    model: str
    room: rtc.Room = field(default_factory=rtc.Room)
    started_at: float = field(default_factory=time.monotonic)
    task: asyncio.Task[None] | None = None
    track_tasks: dict[str, asyncio.Task[None]] = field(default_factory=dict)
    ready: asyncio.Future[None] | None = None
    stopping: bool = False

    async def run(self) -> None:
        try:
            self.room.on("track_subscribed", self._on_track_subscribed)
            self.room.on("track_unsubscribed", self._on_track_unsubscribed)
            self.room.on("disconnected", self._on_disconnected)

            await self.room.connect(
                self.payload.livekit_ws_url,
                self.payload.livekit_token,
                options=rtc.RoomOptions(auto_subscribe=True),
            )
            if self.ready and not self.ready.done():
                self.ready.set_result(None)
            logger.info("Live transcription joined room %s", self.payload.room_name)

            await asyncio.Future()
        except Exception as exc:
            if self.ready and not self.ready.done():
                self.ready.set_exception(exc)
            raise
        except asyncio.CancelledError:
            raise
        finally:
            await self.stop()

    async def stop(self) -> None:
        if self.stopping:
            return
        self.stopping = True

        for task in list(self.track_tasks.values()):
            task.cancel()
        if self.track_tasks:
            await asyncio.gather(*self.track_tasks.values(), return_exceptions=True)
        self.track_tasks.clear()

        with contextlib.suppress(Exception):
            await self.room.disconnect()

    def _on_track_subscribed(
        self,
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        if track.kind != rtc.TrackKind.KIND_AUDIO:
            return

        key = publication.sid or f"{participant.identity}:{id(track)}"
        if key in self.track_tasks:
            return

        speaker = participant.name or participant.identity or "Speaker"
        task = asyncio.create_task(self._transcribe_track(key, track, speaker))
        self.track_tasks[key] = task

        def on_track_done(done_task: asyncio.Task[None], track_key: str = key) -> None:
            self._track_done(track_key, done_task)

        task.add_done_callback(on_track_done)

    def _on_track_unsubscribed(
        self,
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        key = publication.sid or f"{participant.identity}:{id(track)}"
        task = self.track_tasks.pop(key, None)
        if task:
            task.cancel()

    def _on_disconnected(self, *args: object) -> None:
        for task in list(self.track_tasks.values()):
            task.cancel()

    def _track_done(self, track_key: str, task: asyncio.Task[None]) -> None:
        self.track_tasks.pop(track_key, None)
        if task.cancelled():
            return
        exc = task.exception()
        if exc:
            logger.exception("Live transcription track %s failed", track_key, exc_info=exc)

    async def _transcribe_track(self, track_key: str, track: rtc.Track, speaker: str) -> None:
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is required for live transcription")

        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        }

        async with connect(self._realtime_url(), additional_headers=headers) as websocket:
            await websocket.send(json.dumps(self._session_update()))
            audio_task = asyncio.create_task(self._stream_audio(track, websocket))
            receive_task = asyncio.create_task(self._receive_transcripts(websocket, speaker))
            try:
                done, pending = await asyncio.wait(
                    {audio_task, receive_task},
                    return_when=asyncio.FIRST_EXCEPTION,
                )
                for task in pending:
                    task.cancel()
                await asyncio.gather(*pending, return_exceptions=True)
                first_exc: BaseException | None = None
                for task in done:
                    try:
                        task.result()
                    except ConnectionClosedOK:
                        pass
                    except Exception as exc:
                        if first_exc is None:
                            first_exc = exc
                if first_exc is not None:
                    raise first_exc
            finally:
                for task in (audio_task, receive_task):
                    if not task.done():
                        task.cancel()
                await asyncio.gather(audio_task, receive_task, return_exceptions=True)

    async def _stream_audio(self, track: rtc.Track, websocket: Any) -> None:
        audio_stream = rtc.AudioStream.from_track(
            track=track,
            sample_rate=24000,
            num_channels=1,
            frame_size_ms=20,
        )
        last_commit_at = time.monotonic()
        has_uncommitted_audio = False

        async for event in audio_stream:
            audio = bytes(event.frame.data)
            if not audio:
                continue
            has_uncommitted_audio = True
            await websocket.send(
                json.dumps(
                    {
                        "type": "input_audio_buffer.append",
                        "audio": base64.b64encode(audio).decode("ascii"),
                    },
                ),
            )
            now = time.monotonic()
            if now - last_commit_at >= OPENAI_AUDIO_COMMIT_INTERVAL_SECONDS:
                await self._commit_audio(websocket, has_uncommitted_audio)
                has_uncommitted_audio = False
                last_commit_at = now

    async def _receive_transcripts(self, websocket: Any, speaker: str) -> None:
        async for raw_message in websocket:
            event = json.loads(raw_message)
            event_type = event.get("type")
            if event_type == "error":
                raise RuntimeError(event.get("error", {}).get("message", "Realtime error"))
            if event_type != "conversation.item.input_audio_transcription.completed":
                print(f"[realtime] event skipped: {event_type}", flush=True)
                continue

            transcript = str(event.get("transcript") or "").strip()
            print(f"[realtime] transcript [{speaker}]: {transcript[:120]!r}", flush=True)
            if not transcript:
                continue
            await self._post_segment(speaker=speaker, text=transcript)

    async def _post_segment(self, *, speaker: str, text: str) -> None:
        print(f"[realtime] posting segment to core-service [room={self.payload.room_id} speaker={speaker}]", flush=True)
        elapsed_ms = int((time.monotonic() - self.started_at) * 1000)
        url = (
            f"{settings.CORE_SERVICE_BASE_URL.rstrip('/')}"
            f"/office/internal/rooms/{self.payload.room_id}/live-transcript"
        )
        headers = {"x-internal-api-token": settings.INTERNAL_API_TOKEN or ""}
        body = {
            "orgId": self.payload.org_id,
            "roomId": self.payload.room_id,
            "speaker": speaker,
            "text": text,
            "endedAtMs": elapsed_ms,
        }

        print(f"[realtime] POST {url}", flush=True)
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
            response = await client.post(url, headers=headers, json=body)
            print(f"[realtime] POST response: {response.status_code} {response.text[:200]}", flush=True)
            response.raise_for_status()

    def _session_update(self) -> dict[str, Any]:
        return {
            "type": "session.update",
            "session": {
                "type": "transcription",
                "audio": {
                    "input": {
                        "format": {
                            "type": "audio/pcm",
                            "rate": 24000,
                        },
                        "transcription": {
                            "model": self.model,
                        },
                        "turn_detection": None,
                    },
                },
            },
        }

    async def _commit_audio(self, websocket: Any, has_uncommitted_audio: bool) -> None:
        if not has_uncommitted_audio:
            return
        await websocket.send(json.dumps({"type": "input_audio_buffer.commit"}))

    def _realtime_url(self) -> str:
        return f"{OPENAI_REALTIME_URL}?intent=transcription"


class LiveMeetingTranscriptionManager:
    def __init__(self) -> None:
        self._sessions: dict[str, LiveMeetingSession] = {}
        self._lock = asyncio.Lock()

    async def start(self, payload: LiveMeetingStart) -> dict[str, str]:
        model = payload.model or settings.OPENAI_REALTIME_TRANSCRIPTION_MODEL
        async with self._lock:
            existing = self._sessions.get(payload.room_id)
            if existing and existing.task and not existing.task.done():
                return {"roomId": payload.room_id, "status": "already_running", "model": existing.model}

            session = LiveMeetingSession(payload=payload, model=model)
            session.ready = asyncio.get_running_loop().create_future()
            session.task = asyncio.create_task(session.run())
            self._sessions[payload.room_id] = session

            def on_session_done(
                task: asyncio.Task[None],
                room_id: str = payload.room_id,
            ) -> None:
                self._session_done(room_id, task)

            session.task.add_done_callback(
                on_session_done,
            )

        try:
            await asyncio.wait_for(asyncio.shield(session.ready), timeout=10.0)
        except Exception:
            await self.stop(payload.room_id)
            raise

        return {"roomId": payload.room_id, "status": "running", "model": model}

    async def stop(self, room_id: str) -> dict[str, str]:
        async with self._lock:
            session = self._sessions.pop(room_id, None)

        if not session:
            return {"roomId": room_id, "status": "not_running"}

        if session.task:
            session.task.cancel()
            await asyncio.gather(session.task, return_exceptions=True)
        else:
            await session.stop()

        return {"roomId": room_id, "status": "stopped"}

    def status(self, room_id: str) -> dict[str, str]:
        session = self._sessions.get(room_id)
        if not session or not session.task or session.task.done():
            return {"roomId": room_id, "status": "not_running"}
        return {"roomId": room_id, "status": "running", "model": session.model}

    def _session_done(self, room_id: str, task: asyncio.Task[None]) -> None:
        self._sessions.pop(room_id, None)
        if task.cancelled():
            return
        exc = task.exception()
        if exc:
            logger.exception("Live transcription session %s failed", room_id, exc_info=exc)


live_meeting_transcription_manager = LiveMeetingTranscriptionManager()
