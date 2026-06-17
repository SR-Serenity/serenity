"""Calendar tools for workspace QA agent."""

from typing import Annotated

from langchain.tools import ToolRuntime, tool

from src.ai.v1.contexts.schemas.agent_context import AgentContext
from src.services.workspace_service import (
    create_calendar_item,
    delete_calendar_item,
    list_calendar_items,
    update_calendar_item,
)


@tool(
    description=(
        "List calendar events and tasks for this workspace. "
        "Returns title, type, start/end time, location, attendees, and status. "
        "Optionally filter by date range. Use ISO 8601 format for dates (e.g., 2025-06-01T00:00:00Z)."
    )
)
def list_calendar_events_tool(
    runtime: ToolRuntime[AgentContext],
    start_at: Annotated[str | None, "Optional start date filter in ISO 8601 format"] = None,
    end_at: Annotated[str | None, "Optional end date filter in ISO 8601 format"] = None,
) -> str:
    auth_token = runtime.context.auth_token
    if not auth_token:
        return "No auth token available."
    try:
        items = list_calendar_items(auth_token, start_at=start_at, end_at=end_at)
        if not items:
            return "No calendar items found."
        lines = ["Calendar items:"]
        for item in items:
            title = item.get("title", "Untitled")
            itype = item.get("type", "")
            start = item.get("startAt") or item.get("dueDate") or "—"
            end = item.get("endAt") or ""
            location = item.get("location") or "—"
            status = item.get("taskStatus") or item.get("status") or ""
            attendees = [
                a.get("displayName") or a.get("email") or ""
                for a in (item.get("attendees") or [])
            ]
            item_id = item.get("id", "")
            lines.append(
                f"  [{item_id}] {title} ({itype})\n"
                f"    Start: {start}  End: {end}\n"
                f"    Location: {location} | Status: {status}\n"
                f"    Attendees: {', '.join(attendees) or '—'}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing calendar items: {e}"


@tool(
    description=(
        "Get a specific calendar event or task by its ID. "
        "Returns full details including title, type, times, description, attendees, and status."
    )
)
def get_calendar_item_tool(
    item_id: Annotated[str, "The calendar item UUID to fetch"],
    runtime: ToolRuntime[AgentContext],
) -> str:
    auth_token = runtime.context.auth_token
    if not auth_token:
        return "No auth token available."
    try:
        items = list_calendar_items(auth_token)
        item = next((i for i in items if i.get("id") == item_id), None)
        if not item:
            return f"Calendar item {item_id} not found."
        title = item.get("title", "Untitled")
        itype = item.get("type", "")
        start = item.get("startAt") or item.get("dueDate") or "—"
        end = item.get("endAt") or ""
        location = item.get("location") or "—"
        status = item.get("taskStatus") or item.get("status") or "—"
        desc = (item.get("descriptionMarkdown") or "").strip()
        attendees = [a.get("displayName") or a.get("email") or "" for a in (item.get("attendees") or [])]
        lines = [
            f"[{item_id}] {title} ({itype})",
            f"  Start: {start}  End: {end}",
            f"  Location: {location} | Status: {status}",
            f"  Attendees: {', '.join(attendees) or '—'}",
        ]
        if desc:
            lines.append(f"  Description:\n{desc[:500]}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error fetching calendar item {item_id}: {e}"


@tool(
    description=(
        "Search calendar events and tasks by keyword. "
        "Scans titles, descriptions, and locations for the query term."
    )
)
def search_calendar_events_tool(
    query: Annotated[str, "Keyword or phrase to search for in calendar events"],
    runtime: ToolRuntime[AgentContext],
) -> str:
    auth_token = runtime.context.auth_token
    if not auth_token:
        return "No auth token available."
    try:
        items = list_calendar_items(auth_token)
        terms = {t.lower() for t in query.split() if len(t) > 2}
        matches = [
            item for item in items
            if any(
                t in " ".join(filter(None, [item.get("title"), item.get("descriptionMarkdown"), item.get("location")])).lower()
                for t in terms
            )
        ]
        if not matches:
            return f"No calendar items found matching '{query}'."
        lines = [f"Calendar items matching '{query}':"]
        for item in matches:
            item_id = item.get("id", "")
            title = item.get("title", "Untitled")
            itype = item.get("type", "")
            start = item.get("startAt") or item.get("dueDate") or "—"
            attendees = [a.get("displayName") or a.get("email") or "" for a in (item.get("attendees") or [])]
            desc = (item.get("descriptionMarkdown") or "")[:200].replace("\n", " ")
            lines.append(
                f"  [{item_id}] {title} ({itype}) — {start}\n"
                f"    Attendees: {', '.join(attendees) or '—'}\n"
                f"    {desc}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching calendar items: {e}"


def _summary(item: dict) -> str:
    return f"[{item.get('id', '')}] {item.get('title', 'Untitled')} ({item.get('type', '')}) Start: {item.get('startAt') or item.get('dueDate') or '—'}"


def _drop_none(d: dict) -> dict:
    return {k: v for k, v in d.items() if v is not None}


@tool(
    description=(
        "Create a calendar event, meeting, or task. "
        "EVENT and MEETING require start_at and end_at. TASK can use due_date."
    )
)
def create_calendar_item_tool(
    title: Annotated[str, "Calendar item title"],
    type: Annotated[str, "Calendar item type: EVENT, MEETING, or TASK"],
    runtime: ToolRuntime[AgentContext],
    visibility: Annotated[str, "Visibility: PERSONAL or COMPANY"] = "PERSONAL",
    description_markdown: Annotated[str | None, "Optional description"] = None,
    location: Annotated[str | None, "Optional location"] = None,
    start_at: Annotated[str | None, "Start time in ISO 8601 format"] = None,
    end_at: Annotated[str | None, "End time in ISO 8601 format"] = None,
    all_day: Annotated[bool | None, "Whether this is an all-day item"] = None,
    task_status: Annotated[str | None, "Task status: TODO or DONE"] = None,
    due_date: Annotated[str | None, "Task due date in ISO 8601 format"] = None,
    attendee_ids: Annotated[list[str] | None, "Workspace user IDs to invite"] = None,
    room_id: Annotated[str | None, "Optional office room ID"] = None,
    wiki_page_id: Annotated[str | None, "Optional wiki page ID"] = None,
) -> str:
    auth_token = runtime.context.auth_token
    if not auth_token:
        return "No auth token available."
    try:
        item = create_calendar_item(auth_token, _drop_none({
            "type": type.upper(), "visibility": visibility.upper(), "title": title,
            "descriptionMarkdown": description_markdown, "location": location,
            "startAt": start_at, "endAt": end_at, "allDay": all_day,
            "taskStatus": task_status.upper() if task_status else None,
            "dueDate": due_date, "attendeeIds": attendee_ids,
            "roomId": room_id, "wikiPageId": wiki_page_id,
        }))
        return f"Calendar item created: {_summary(item)}"
    except Exception as e:
        return f"Error creating calendar item: {e}"


@tool(description="Update an existing calendar item by ID.")
def update_calendar_item_tool(
    item_id: Annotated[str, "Calendar item ID to update"],
    runtime: ToolRuntime[AgentContext],
    title: Annotated[str | None, "New title"] = None,
    type: Annotated[str | None, "New type: EVENT, MEETING, or TASK"] = None,
    visibility: Annotated[str | None, "New visibility: PERSONAL or COMPANY"] = None,
    description_markdown: Annotated[str | None, "New description"] = None,
    location: Annotated[str | None, "New location"] = None,
    start_at: Annotated[str | None, "New start time in ISO 8601 format"] = None,
    end_at: Annotated[str | None, "New end time in ISO 8601 format"] = None,
    all_day: Annotated[bool | None, "Whether all-day"] = None,
    task_status: Annotated[str | None, "New task status: TODO or DONE"] = None,
    due_date: Annotated[str | None, "New due date in ISO 8601 format"] = None,
    attendee_ids: Annotated[list[str] | None, "Replacement attendee user IDs"] = None,
    room_id: Annotated[str | None, "New room ID"] = None,
    wiki_page_id: Annotated[str | None, "New wiki page ID"] = None,
) -> str:
    auth_token = runtime.context.auth_token
    if not auth_token:
        return "No auth token available."
    payload = _drop_none({
        "type": type.upper() if type else None, "visibility": visibility.upper() if visibility else None,
        "title": title, "descriptionMarkdown": description_markdown, "location": location,
        "startAt": start_at, "endAt": end_at, "allDay": all_day,
        "taskStatus": task_status.upper() if task_status else None,
        "dueDate": due_date, "attendeeIds": attendee_ids, "roomId": room_id, "wikiPageId": wiki_page_id,
    })
    if not payload:
        return "No changes provided."
    try:
        item = update_calendar_item(auth_token, item_id, payload)
        return f"Calendar item updated: {_summary(item)}"
    except Exception as e:
        return f"Error updating calendar item {item_id}: {e}"


@tool(description="Delete an existing calendar item by ID.")
def delete_calendar_item_tool(
    item_id: Annotated[str, "Calendar item ID to delete"],
    runtime: ToolRuntime[AgentContext],
) -> str:
    auth_token = runtime.context.auth_token
    if not auth_token:
        return "No auth token available."
    try:
        result = delete_calendar_item(auth_token, item_id)
        return f"Calendar item {item_id} deleted." if result.get("success") else f"Delete result: {result}"
    except Exception as e:
        return f"Error deleting calendar item {item_id}: {e}"
