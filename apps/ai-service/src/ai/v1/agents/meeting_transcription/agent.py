"""Meeting audio transcription using OpenAI audio models."""

import logging
from dataclasses import dataclass, field
from numbers import Real
from pathlib import PurePosixPath
from urllib.parse import urlparse

import httpx

from src.core.config import settings

logger = logging.getLogger(__name__)

OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions"
MAX_AUDIO_BYTES = 1024 * 1024 * 1024


@dataclass
class MeetingTranscriptSegment:
    text: str
    speaker: str | None = None
    start: float | None = None
    end: float | None = None


@dataclass
class MeetingTranscriptionResult:
    text: str
    segments: list[MeetingTranscriptSegment] = field(default_factory=list)
    model: str = settings.OPENAI_FINAL_TRANSCRIPTION_MODEL


class MeetingTranscriptionAgent:
    name = "MeetingTranscriptionAgent"

    async def transcribe_url(
        self,
        *,
        audio_url: str,
        model: str | None = None,
        language: str | None = None,
        prompt: str | None = None,
    ) -> MeetingTranscriptionResult:
        selected_model = model or settings.OPENAI_FINAL_TRANSCRIPTION_MODEL
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        filename, content_type, audio = await self._download_audio(audio_url)
        response = await self._call_openai(
            filename=filename,
            content_type=content_type,
            audio=audio,
            model=selected_model,
            language=language,
            prompt=prompt,
        )

        return self._parse_response(response, selected_model)

    async def _download_audio(self, audio_url: str) -> tuple[str, str, bytes]:
        parsed = urlparse(audio_url)
        filename = PurePosixPath(parsed.path).name or "meeting-audio.webm"

        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            async with client.stream("GET", audio_url, follow_redirects=True) as response:
                response.raise_for_status()
                content_type = response.headers.get("content-type", "application/octet-stream")
                chunks: list[bytes] = []
                total = 0
                async for chunk in response.aiter_bytes():
                    total += len(chunk)
                    if total > MAX_AUDIO_BYTES:
                        raise ValueError("Audio file is too large to transcribe")
                    chunks.append(chunk)

        return filename, content_type, b"".join(chunks)

    async def _call_openai(
        self,
        *,
        filename: str,
        content_type: str,
        audio: bytes,
        model: str,
        language: str | None,
        prompt: str | None,
    ) -> dict:
        data: dict[str, str] = {"model": model}

        if model == "gpt-4o-transcribe-diarize":
            data["response_format"] = "diarized_json"
            data["chunking_strategy"] = "auto"
        else:
            data["response_format"] = "json"
            if prompt:
                data["prompt"] = prompt

        if language:
            data["language"] = language

        files = {"file": (filename, audio, content_type)}
        headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}

        async with httpx.AsyncClient(timeout=httpx.Timeout(300.0)) as client:
            response = await client.post(
                OPENAI_TRANSCRIPTIONS_URL,
                headers=headers,
                data=data,
                files=files,
            )
            response.raise_for_status()
            return response.json()

    def _parse_response(self, payload: dict, model: str) -> MeetingTranscriptionResult:
        text = str(payload.get("text") or "").strip()
        raw_segments = payload.get("segments")
        segments: list[MeetingTranscriptSegment] = []

        if isinstance(raw_segments, list):
            for segment in raw_segments:
                if not isinstance(segment, dict):
                    continue
                segment_text = str(segment.get("text") or "").strip()
                if not segment_text:
                    continue
                segments.append(
                    MeetingTranscriptSegment(
                        text=segment_text,
                        speaker=self._string_or_none(segment.get("speaker")),
                        start=self._float_or_none(segment.get("start")),
                        end=self._float_or_none(segment.get("end")),
                    )
                )

        if not text and segments:
            text = " ".join(segment.text for segment in segments)

        return MeetingTranscriptionResult(text=text, segments=segments, model=model)

    def to_markdown(self, result: MeetingTranscriptionResult) -> str:
        if result.segments:
            lines = []
            for segment in result.segments:
                speaker = segment.speaker or "Speaker"
                timestamp = self._format_timestamp(segment.start)
                lines.append(f"- {timestamp} {speaker}: {segment.text}")
            return "\n".join(lines)

        if result.text:
            return f"- 00:00 Speaker: {result.text}"

        return "- No transcript returned."

    def _format_timestamp(self, seconds: float | None) -> str:
        if seconds is None:
            return "00:00"
        total_seconds = max(0, int(seconds))
        minutes = total_seconds // 60
        remainder = total_seconds % 60
        return f"{minutes:02d}:{remainder:02d}"

    def _string_or_none(self, value: object) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    def _float_or_none(self, value: object) -> float | None:
        if value is None:
            return None
        if isinstance(value, Real):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return None
        return None


meeting_transcription_agent = MeetingTranscriptionAgent()
