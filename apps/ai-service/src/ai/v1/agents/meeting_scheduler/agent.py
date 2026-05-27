"""LLM-powered meeting and room scheduling agent."""

import json
import re

from langchain_openai import ChatOpenAI

from src.api.internal.v1.schemas import ChatMessage, ProposedAction
from src.core.config import settings

_EXTRACT_PROMPT = """\
You are a meeting scheduling assistant. Given the conversation below, do one of three things:

1. If the user has provided enough information to schedule a meeting (at minimum: a date and start time), extract the details and respond with JSON:
{{"ready": true, "type": "CREATE_MEETING", "title": "<short meeting title>", "startAt": "<ISO 8601 datetime with UTC offset, e.g. 2026-05-29T09:00:00+00:00>", "endAt": "<ISO 8601 datetime>", "attendeeNames": ["<name>", ...], "location": "<room or location, or null>"}}

2. If critical information is missing (date, time), respond with JSON asking for it:
{{"ready": false, "question": "<a short, friendly question asking only for what is missing>"}}

3. If the latest user message is not a meeting scheduling request or a clarification for the pending meeting (for example: it asks to create a task, asks a general question, changes topic, says no, cancels, or declines), stop the scheduling flow and respond with JSON:
{{"ready": false, "cancelled": true, "question": null}}

Rules:
- Today's date is {today}.
- Focus on the latest user message. Older meeting details are context only; they must not create a duplicate proposal after the user changes intent or declines.
- Treat corrections to the pending meeting (for example changing time, date, title, attendees, room, or location) as meeting clarifications and update the same proposal.
- The "question" value MUST be written in the same language the user is writing in.
- Respond ONLY with valid JSON — no markdown, no extra text.

Conversation:
{conversation}
"""


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0,
    )


class MeetingSchedulerAgent:
    name = "MeetingSchedulerAgent"

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def needs_clarification(self, messages: list[ChatMessage]) -> str | None:
        result = _call_llm(messages)
        if result.get("cancelled"):
            return None
        if not result.get("ready"):
            return result.get("question", "Could you share a date and time for the meeting?")
        return None

    def propose(self, messages: list[ChatMessage]) -> ProposedAction | None:
        result = _call_llm(messages)
        if result.get("cancelled"):
            return None
        if not result.get("ready"):
            return None
        action_type = result.get("type", "CREATE_MEETING")
        return ProposedAction(
            type=action_type,  # type: ignore[arg-type]
            confidence=0.85,
            payload={
                "title": result.get("title", "New meeting"),
                "startAt": result.get("startAt"),
                "endAt": result.get("endAt"),
                "attendeeNames": result.get("attendeeNames", []),
                "location": result.get("location"),
            },
        )


def _conversation_text(messages: list[ChatMessage]) -> str:
    return "\n".join(f"{m.role.upper()}: {m.content}" for m in messages)


def _call_llm(messages: list[ChatMessage]) -> dict:
    from datetime import date
    if not settings.OPENAI_API_KEY:
        return _fallback_extract(messages)
    today = date.today().isoformat()
    prompt = _EXTRACT_PROMPT.format(
        today=today,
        conversation=_conversation_text(messages),
    )
    llm = _get_llm()
    try:
        response = llm.invoke(prompt)
        return json.loads(str(response.content))
    except (json.JSONDecodeError, AttributeError, Exception):
        return _fallback_extract(messages)


def _fallback_extract(messages: list[ChatMessage]) -> dict:
    text = _latest_user_text(messages)
    lowered = text.lower()
    if _is_cancel_or_intent_switch(lowered):
        return {"ready": False, "cancelled": True, "question": None}
    if not any(keyword in lowered for keyword in ["meeting", "schedule", "book a room", "room"]):
        return {"ready": False, "cancelled": True, "question": None}

    action_type = "BOOK_ROOM" if "room" in lowered else "CREATE_MEETING"
    return {
        "ready": True,
        "type": action_type,
        "title": _clean_title(text, default="New meeting"),
        "startAt": None,
        "endAt": None,
        "attendeeNames": [],
        "location": "Room" if "room" in lowered else None,
    }


def _latest_user_text(messages: list[ChatMessage]) -> str:
    for message in reversed(messages):
        if message.role == "user":
            return message.content.strip()
    return ""


def _is_cancel_or_intent_switch(text: str) -> bool:
    cancellation_words = ("cancel", "never mind", "nevermind", "decline", "no thanks", "stop")
    if any(word in text for word in cancellation_words):
        return True
    return "task" in text and not any(word in text for word in ("meeting", "schedule", "room"))


def _clean_title(text: str, default: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return default
    return cleaned[:80]
