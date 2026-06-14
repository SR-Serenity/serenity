"""Meeting notes agent for transcript-to-notes summarization."""

import logging

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, SecretStr

from src.core.config import settings

logger = logging.getLogger(__name__)


class MeetingNotesResult(BaseModel):
    """Structured meeting note returned by the LLM."""

    summary: list[str] = Field(default_factory=list)


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
            "Write a concise summary of the meeting as bullet points. "
            "Each bullet should capture one key point, topic discussed, or outcome. "
            "Ground every bullet in the transcript. Do not invent facts. "
            "Write at most 10 bullets. Keep each bullet clear and self-contained."
        )

        user_prompt = (
            "Transcript:\n"
            f"{transcript or '(empty transcript)'}\n\n"
            "Existing meeting note content, if any:\n"
            f"{existing_notes or '(none)'}\n\n"
            "Write the meeting summary bullets."
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
        bullets = "\n".join(f"- {item}" for item in result.summary) or "- No summary available."
        return f"## Meeting Summary\n\n{bullets}"

    def _limit(self, result: MeetingNotesResult) -> MeetingNotesResult:
        return MeetingNotesResult(
            summary=self._clean(result.summary, 10),
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

    def _section(self, title: str, items: list[str], empty: str) -> str:
        bullets = items or [empty]
        return f"### {title}\n" + "\n".join(f"- {item}" for item in bullets)

    def _fallback(self, transcript: str) -> MeetingNotesResult:
        lines = [
            line.split(":", 1)[-1].strip()
            for line in transcript.splitlines()
            if line.strip().startswith("- ")
        ]
        summary = [line for line in lines if len(line) > 24][:10]
        return MeetingNotesResult(summary=summary)

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
