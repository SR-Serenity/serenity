"""LLM-powered schedule item and reschedule agent."""

import json
import re
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from langchain_openai import ChatOpenAI

from src.api.internal.v1.schemas import ChatMessage, ProposedAction
from src.core.config import settings
from src.services.workspace_service import list_calendar_items

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

5. For changing, moving, or rescheduling an existing calendar item, respond with JSON:
{{"ready": true, "type": "UPDATE_CALENDAR_ITEM", "itemId": "<existing calendar item id>", "itemType": "<EVENT | MEETING | TASK>", "title": "<current or updated title>", "startAt": "<ISO 8601 datetime WITHOUT timezone offset, or null>", "endAt": "<ISO 8601 datetime WITHOUT timezone offset, or null>", "description": "<updated description or null>", "location": "<updated location or null>", "attendeeNames": ["<name>", ...]}}

6. If the request is too vague, respond with JSON:
{{"ready": false, "question": "<a short friendly question asking only for the missing details>"}}

Rules:
- Today's date is {today}.
- Never convert a user-requested "event" into a task.
- A task is something to complete. An event is a block of time on the calendar. A meeting involves attendees, calls, rooms, syncs, standups, or collaboration.
- If the user asks to change, update, move, shift, or reschedule a meeting/event, treat it as an update request, not a new creation.
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

    def needs_clarification(
        self,
        messages: list[ChatMessage],
        context: dict | None = None,
    ) -> str | None:
        result = _call_llm(messages, context=context)
        if result.get("cancelled"):
            return None
        if not result.get("ready"):
            return result.get("question", "What should this schedule item be about?")
        return None

    def propose(
        self,
        messages: list[ChatMessage],
        context: dict | None = None,
    ) -> ProposedAction | None:
        result = _call_llm(messages, context=context)
        if result.get("cancelled"):
            return None
        if not result.get("ready"):
            return None
        action_type = result.get("type", "CREATE_TASK")
        if action_type == "UPDATE_CALENDAR_ITEM":
            item_id = result.get("itemId")
            if _is_placeholder_id(item_id):
                return None
            return ProposedAction(
                type="UPDATE_CALENDAR_ITEM",
                confidence=0.9,
                payload={
                    "itemId": item_id,
                    "itemType": result.get("itemType"),
                    "title": result.get("title"),
                    "startAt": result.get("startAt"),
                    "endAt": result.get("endAt"),
                    "descriptionMarkdown": result.get("description"),
                    "location": result.get("location"),
                    "attendeeNames": result.get("attendeeNames", []),
                },
            )
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


_PLACEHOLDER_ID_RE = re.compile(
    r"^(<.+>|existing[_\-\s].*id.*|.*[_\-\s]id[_\-\s].*placeholder|sample.*id|fake.*id|your[_\-\s].*id.*)$",
    re.IGNORECASE,
)
_REAL_ID_RE = re.compile(r"^[a-zA-Z0-9_\-]{8,}$")


def _is_placeholder_id(value: object) -> bool:
    """Return True if the value is missing or looks like a template placeholder, not a real ID."""
    if not value:
        return True
    s = str(value).strip()
    if _PLACEHOLDER_ID_RE.match(s):
        return True
    # Real IDs (UUID, CUID, nanoid, etc.) are alphanumeric+dash/underscore, ≥8 chars.
    # Anything with spaces or that fails this shape is treated as a placeholder.
    return not _REAL_ID_RE.match(s)


def _call_llm(messages: list[ChatMessage], context: dict | None = None) -> dict:
    latest_text = _latest_user_text(messages)
    if _looks_like_update_request(latest_text):
        resolved = _resolve_update_request(latest_text, context)
        if resolved:
            return resolved
    if not settings.OPENAI_API_KEY:
        return _fallback_extract(messages, context=context)
    today = _context_today(context)
    prompt = _EXTRACT_PROMPT.format(
        today=today,
        conversation=_conversation_text(messages),
    )
    llm = _get_llm()
    try:
        response = llm.invoke(prompt)
        result = json.loads(str(response.content))
        # Guard against the LLM echoing the template placeholder as the itemId.
        if result.get("type") == "UPDATE_CALENDAR_ITEM" and _is_placeholder_id(result.get("itemId")):
            return {"ready": False, "question": "Which meeting or event would you like me to update?"}
        return result
    except (json.JSONDecodeError, AttributeError, Exception):
        return _fallback_extract(messages, context=context)


def _fallback_extract(messages: list[ChatMessage], context: dict | None = None) -> dict:
    text = _latest_user_text(messages)
    lowered = text.lower()
    if _looks_like_update_request(text):
        resolved = _resolve_update_request(text, context)
        if resolved:
            return resolved
        return {"ready": False, "question": "Which meeting would you like me to change?"}
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
        today = _context_today(context)
        return {
            "ready": True,
            "type": action_type,
            "title": _clean_title(text, default="New meeting"),
            "startAt": f"{today}T10:00:00",
            "endAt": f"{today}T11:00:00",
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


def _looks_like_update_request(text: str) -> bool:
    lowered = text.lower()
    return any(word in lowered for word in ("change", "reschedule", "update", "move", "shift", "postpone", "push"))


def _clean_title(text: str, default: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    return cleaned[:80] if cleaned else default


def _context_today(context: dict | None) -> str:
    time_zone = ""
    if isinstance(context, dict):
        time_zone = str(context.get("timeZone") or context.get("time_zone") or "")
    if not time_zone:
        return date.today().isoformat()
    try:
        tz = ZoneInfo(time_zone)
    except ZoneInfoNotFoundError:
        return date.today().isoformat()
    return datetime.now(tz).date().isoformat()


def _resolve_update_request(text: str, context: dict | None) -> dict | None:
    if not isinstance(context, dict):
        return None

    auth_token = str(context.get("auth_token") or "")
    time_zone = str(context.get("timeZone") or context.get("time_zone") or "UTC")
    if not auth_token:
        return None

    target_date = _parse_target_date(text, time_zone, _context_today(context))
    start_iso, end_iso = _day_bounds_iso(target_date, time_zone)
    try:
        items = list_calendar_items(auth_token, start_at=start_iso, end_at=end_iso)
    except Exception:
        return None

    meetings = [item for item in items if str(item.get("type") or "").upper() == "MEETING"]
    if not meetings:
        return None

    title_hint = _extract_title_hint(text)
    selected = _select_update_target(meetings, title_hint)
    if not selected:
        return None

    start_at, end_at = _parse_time_range(text, target_date, time_zone)
    payload: dict = {
        "ready": True,
        "type": "UPDATE_CALENDAR_ITEM",
        "itemId": selected.get("id"),
        "itemType": selected.get("type") or "MEETING",
        "title": selected.get("title") or "Updated meeting",
        "startAt": start_at or selected.get("startAt"),
        "endAt": end_at or selected.get("endAt"),
        "description": selected.get("descriptionMarkdown"),
        "location": selected.get("location"),
        "attendeeNames": [
            attendee.get("displayName")
            for attendee in (selected.get("attendees") or [])
            if attendee.get("displayName")
        ],
    }
    return payload


def _select_update_target(meetings: list[dict], title_hint: str | None) -> dict | None:
    if title_hint:
        norm = title_hint.lower()
        for item in meetings:
            title = str(item.get("title") or "").lower()
            if norm in title or title in norm:
                return item
    if len(meetings) == 1:
        return meetings[0]
    return None


def _extract_title_hint(text: str) -> str | None:
    quoted = re.search(r'"([^"]+)"', text)
    if quoted:
        return quoted.group(1).strip()
    return None


def _parse_target_date(text: str, time_zone: str, default_date: str) -> str:
    lowered = text.lower()
    base = _date_from_iso(default_date, time_zone)
    if any(word in lowered for word in ("tomorrow", "tmr", "tmrw")):
        return (base + timedelta(days=1)).isoformat()
    if "today" in lowered:
        return base.isoformat()
    return base.isoformat()


def _date_from_iso(date_str: str, time_zone: str):
    try:
        return datetime.fromisoformat(date_str).date()
    except ValueError:
        tz = _safe_zone(time_zone)
        if tz is None:
            return date.today()
        return datetime.now(tz).date()


def _day_bounds_iso(date_str: str, time_zone: str) -> tuple[str, str]:
    tz = _safe_zone(time_zone)
    if tz is None:
        return f"{date_str}T00:00:00", f"{date_str}T23:59:59"
    start = datetime.fromisoformat(f"{date_str}T00:00:00").replace(tzinfo=tz)
    end = datetime.fromisoformat(f"{date_str}T23:59:59").replace(tzinfo=tz)
    return start.isoformat(), end.isoformat()


def _parse_time_range(text: str, date_str: str, time_zone: str) -> tuple[str | None, str | None]:
    match = re.search(
        r"(?P<start>\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:-|to|until|till|–|—)\s*(?P<end>\d{1,2}(?::\d{2})?\s*(?:am|pm))",
        text,
        flags=re.IGNORECASE,
    )
    if not match:
        return None, None
    start = _parse_clock_time(match.group("start"))
    end = _parse_clock_time(match.group("end"))
    if start is None or end is None:
        return None, None
    tz = _safe_zone(time_zone)
    if tz is None:
        return f"{date_str}T{start}", f"{date_str}T{end}"
    start_dt = datetime.fromisoformat(f"{date_str}T{start}").replace(tzinfo=tz)
    end_dt = datetime.fromisoformat(f"{date_str}T{end}").replace(tzinfo=tz)
    return start_dt.isoformat(), end_dt.isoformat()


def _parse_clock_time(value: str) -> str | None:
    lowered = value.strip().lower().replace(" ", "")
    match = re.fullmatch(r"(?P<h>\d{1,2})(?::(?P<m>\d{2}))?(?P<period>am|pm)", lowered)
    if not match:
        return None
    hour = int(match.group("h"))
    minute = int(match.group("m") or "0")
    period = match.group("period")
    if hour < 1 or hour > 12 or minute > 59:
        return None
    if period == "pm" and hour != 12:
        hour += 12
    if period == "am" and hour == 12:
        hour = 0
    return f"{hour:02d}:{minute:02d}:00"


def _safe_zone(time_zone: str):
    try:
        return ZoneInfo(time_zone)
    except ZoneInfoNotFoundError:
        return None
