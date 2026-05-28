"""LLM-powered schedule item creation agent."""

import json
import re

from langchain_openai import ChatOpenAI

from src.api.internal.v1.schemas import ChatMessage, ProposedAction
from src.core.config import settings

_EXTRACT_PROMPT = """\
You are a schedule assistant. Given the conversation below, classify and extract calendar proposals.

1. For a task / to-do / assigned work item, respond with JSON:
{{"ready": true, "type": "CREATE_TASK", "title": "<concise task title, max 80 chars>", "description": "<fuller description or null>", "dueDate": "<ISO 8601 date string or null>", "assignee": "<name or null>"}}

2. For a generic calendar event / appointment / time block that is not a meeting, respond with JSON:
{{"ready": true, "type": "CREATE_EVENT", "title": "<short event title>", "startAt": "<ISO 8601 datetime WITHOUT timezone offset, e.g. 2026-05-29T10:00:00, or null>", "endAt": "<ISO 8601 datetime WITHOUT timezone offset, e.g. 2026-05-29T11:00:00, or null>", "location": "<location or null>"}}

3. For a meeting, call, interview, sync, standup, or collaborative appointment, respond with JSON:
{{"ready": true, "type": "CREATE_MEETING", "title": "<short meeting title>", "startAt": "<ISO 8601 datetime WITHOUT timezone offset, e.g. 2026-05-29T10:00:00, or null>", "endAt": "<ISO 8601 datetime WITHOUT timezone offset, e.g. 2026-05-29T11:00:00, or null>", "attendeeNames": ["<name>", ...], "location": "<room or location, or null>"}}

4. For a room booking, respond with JSON:
{{"ready": true, "type": "BOOK_ROOM", "title": "<short booking title>", "startAt": "<ISO 8601 datetime WITHOUT timezone offset, e.g. 2026-05-29T10:00:00, or null>", "endAt": "<ISO 8601 datetime WITHOUT timezone offset, e.g. 2026-05-29T11:00:00, or null>", "attendeeNames": ["<name>", ...], "location": "<room or location, or null>"}}

5. If the request is too vague, respond with JSON:
{{"ready": false, "question": "<a short friendly question asking only for the missing details>"}}

Rules:
- Today's date is {today}.
- Never convert a user-requested "event" into a task.
- A task is something to complete. An event is a block of time on the calendar. A meeting involves attendees, calls, rooms, syncs, standups, or collaboration.
- If one message asks for multiple schedule items, return the clearest immediate proposal from the latest user request.
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


class ScheduleAgent:
    name = "ScheduleAgent"

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def needs_clarification(self, messages: list[ChatMessage]) -> str | None:
        result = _call_llm(messages)
        if result.get("cancelled"):
            return None
        if not result.get("ready"):
            return result.get("question", "What should this schedule item be about?")
        return None

    def propose(self, messages: list[ChatMessage]) -> ProposedAction | None:
        result = _call_llm(messages)
        if result.get("cancelled"):
            return None
        if not result.get("ready"):
            return None
        action_type = result.get("type", "CREATE_TASK")
        if action_type in {"CREATE_EVENT", "CREATE_MEETING", "BOOK_ROOM"}:
            return ProposedAction(
                type=action_type,
                confidence=0.85,
                payload={
                    "title": result.get("title", "New meeting" if action_type in {"CREATE_MEETING", "BOOK_ROOM"} else "New event"),
                    "startAt": result.get("startAt"),
                    "endAt": result.get("endAt"),
                    "attendeeNames": result.get("attendeeNames", []),
                    "location": result.get("location"),
                },
            )
        return ProposedAction(
            type="CREATE_TASK",
            confidence=0.85,
            payload={
                "title": result.get("title", "New task"),
                "description": result.get("description"),
                "dueDate": result.get("dueDate"),
                "assignee": result.get("assignee"),
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
    if _looks_like_event(lowered):
        title = _clean_title(text, default="New event")
        return {
            "ready": True,
            "type": "CREATE_EVENT",
            "title": title,
            "startAt": None,
            "endAt": None,
            "location": None,
        }

    if _looks_like_task(lowered):
        title = re.sub(r"\s+", " ", text).strip()
        if not title or title.lower() in {"create a task", "add a task", "new task"}:
            return {"ready": False, "question": "What should this task be about?"}
        return {
            "ready": True,
            "type": "CREATE_TASK",
            "title": title[:80],
            "description": text,
            "dueDate": None,
            "assignee": None,
        }

    if _looks_like_meeting(lowered):
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

    return {"ready": False, "question": "What should this schedule item be about?"}


def _latest_user_text(messages: list[ChatMessage]) -> str:
    for message in reversed(messages):
        if message.role == "user":
            return message.content.strip()
    return ""


def _looks_like_task(text: str) -> bool:
    return any(keyword in text for keyword in ["task", "todo", "to-do"])


def _looks_like_event(text: str) -> bool:
    return any(keyword in text for keyword in ["event", "appointment", "time block", "calendar block"])


def _looks_like_meeting(text: str) -> bool:
    meeting_words = ("meeting", "call", "sync", "standup", "interview", "book a room", "room")
    return any(word in text for word in meeting_words)


def _clean_title(text: str, default: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    return cleaned[:80] if cleaned else default
