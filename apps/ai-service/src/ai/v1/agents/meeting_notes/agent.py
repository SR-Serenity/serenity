"""Meeting notes agent for transcript-to-notes summarization."""

import logging

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, SecretStr

from src.core.config import settings

logger = logging.getLogger(__name__)


class MeetingNotesResult(BaseModel):
    """Structured meeting note returned by the LLM."""

    summary: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    action_items: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    key_transcript_highlights: list[str] = Field(default_factory=list)


class MeetingNotesAgent:
    name = "MeetingNotesAgent"

    def __init__(self) -> None:
        self._llm = (
            ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=SecretStr(settings.OPENAI_API_KEY),
                temperature=0,
            ).with_structured_output(MeetingNotesResult)
            if settings.OPENAI_API_KEY
            else None
        )

    def summarize(
        self,
        *,
        transcript_markdown: str,
        existing_notes_markdown: str | None = None,
    ) -> MeetingNotesResult:
        transcript = transcript_markdown.strip()
        existing_notes = (existing_notes_markdown or "").strip()

        if not self._llm:
            logger.warning("meeting_notes: OPENAI_API_KEY not set, using fallback")
            return self._fallback(transcript)

        system_prompt = (
            "You are a meeting notes assistant for Serenity, a workspace collaboration app. "
            "Turn a meeting transcript into structured notes. Ground every item in the transcript. "
            "Do not invent decisions, owners, deadlines, or questions. "
            "Use empty lists when the transcript does not support a section. "
            "Keep every item clear and self-contained."
        )

        user_prompt = (
            "Transcript:\n"
            f"{transcript or '(empty transcript)'}\n\n"
            "Existing meeting note content, if any:\n"
            f"{existing_notes or '(none)'}\n\n"
            "Return structured notes with meeting summary, decisions, action items, "
            "open questions, and key transcript highlights."
        )

        try:
            result = self._llm.invoke(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ]
            )
            if isinstance(result, MeetingNotesResult):
                return self._limit(result)
        except Exception as exc:
            logger.exception("meeting_notes: unexpected error: %s", exc)

        return self._fallback(transcript)

    def to_markdown(self, result: MeetingNotesResult) -> str:
        return "\n\n".join(
            [
                self._section("Meeting Summary", result.summary, "No meeting summary available."),
                self._section("Decisions", result.decisions, "No decisions captured."),
                self._section(
                    "Action Items",
                    result.action_items,
                    "No action items captured.",
                    task_list=True,
                ),
                self._section("Open Questions", result.open_questions, "No open questions captured."),
                self._section(
                    "Key Transcript Highlights",
                    result.key_transcript_highlights,
                    "No transcript highlights captured.",
                ),
            ]
        )

    def _limit(self, result: MeetingNotesResult) -> MeetingNotesResult:
        return MeetingNotesResult(
            summary=self._clean(result.summary, 10),
            decisions=self._clean(result.decisions, 8),
            action_items=self._clean(result.action_items, 10),
            open_questions=self._clean(result.open_questions, 8),
            key_transcript_highlights=self._clean(result.key_transcript_highlights, 8),
        )

    def _clean(self, items: list[str], limit: int) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for item in items:
            value = item.strip()
            key = value.lower()
            if not value or key in seen:
                continue
            cleaned.append(value)
            seen.add(key)
            if len(cleaned) >= limit:
                break
        return cleaned

    def _section(
        self,
        title: str,
        items: list[str],
        empty: str,
        *,
        task_list: bool = False,
    ) -> str:
        bullets = items or [empty]
        if task_list and items:
            body = "\n".join(f"- [ ] {item}" for item in bullets)
        else:
            body = "\n".join(f"- {item}" for item in bullets)
        return f"## {title}\n\n{body}"

    def _fallback(self, transcript: str) -> MeetingNotesResult:
        lines = [
            line.strip().lstrip("-").strip()
            for line in transcript.splitlines()
            if line.strip().startswith("- ")
        ]
        spoken_lines = [
            self._spoken_text(line)
            for line in lines
            if line and not line.startswith("##")
        ]

        if not spoken_lines:
            return MeetingNotesResult(summary=["No transcript provided."])

        decisions = self._matches(
            spoken_lines,
            ["decided", "decision", "agreed", "approved", "confirmed", "chose"],
            8,
        )
        action_items = self._matches(
            spoken_lines,
            ["action", "todo", "to do", "follow up", "next step", "will ", "owner"],
            10,
        )
        open_questions = [
            line for line in spoken_lines
            if "?" in line or any(word in line.lower() for word in ["blocked", "unknown", "need to clarify"])
        ][:8]

        return MeetingNotesResult(
            summary=spoken_lines[:5],
            decisions=decisions,
            action_items=action_items,
            open_questions=open_questions,
            key_transcript_highlights=spoken_lines[:8],
        )

    def _spoken_text(self, line: str) -> str:
        timestamped = line.split(maxsplit=1)
        if len(timestamped) == 2 and ":" in timestamped[0]:
            speaker_line = timestamped[1]
            if ":" in speaker_line:
                return speaker_line.split(":", 1)[1].strip()

        if ":" in line:
            return line.split(":", 1)[1].strip()

        return line

    def _matches(self, lines: list[str], needles: list[str], limit: int) -> list[str]:
        matches: list[str] = []
        for line in lines:
            lower = line.lower()
            if any(needle in lower for needle in needles):
                matches.append(line)
            if len(matches) >= limit:
                break
        return matches


meeting_notes_agent = MeetingNotesAgent()
