"""Calendar tools for workspace QA agent."""

from typing import Annotated

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from src.services.workspace_service import (
    create_calendar_item,
    delete_calendar_item,
    list_calendar_items,
    update_calendar_item,
)


def _get_auth_token(config: RunnableConfig) -> str:
    return config.get("configurable", {}).get("agent_context", {}).get("auth_token", "")


@tool(
    description=(
        "List calendar events and tasks for this workspace. "
        "Returns title, type, start/end time, location, attendees, and status. "
        "Optionally filter by date range. Use ISO 8601 format for dates (e.g., 2025-06-01T00:00:00Z)."
    )
)
def list_calendar_events_tool(
    config: RunnableConfig,
    start_at: Annotated[
        str | None,
        "Optional start date filter in ISO 8601 format (e.g., 2025-06-01T00:00:00Z)",
    ] = None,
    end_at: Annotated[
        str | None,
        "Optional end date filter in ISO 8601 format (e.g., 2025-06-30T23:59:59Z)",
    ] = None,
) -> str:
    auth_token = _get_auth_token(config)
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
            attendee_str = ", ".join(attendees) if attendees else "—"
            item_id = item.get("id", "")
            lines.append(
                f"  [{item_id}] {title} ({itype})\n"
                f"    Start: {start}  End: {end}\n"
                f"    Location: {location} | Status: {status}\n"
                f"    Attendees: {attendee_str}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing calendar items: {e}"


@tool(
    description=(
        "Get a specific calendar event or task by its ID. "
        "Returns full details including title, type, times, description, attendees, and status. "
        "Use this when you already have the item ID from context or a previous tool call."
    )
)
def get_calendar_item_tool(
    item_id: Annotated[str, "The calendar item UUID to fetch"],
    config: RunnableConfig,
) -> str:
    auth_token = _get_auth_token(config)
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
        attendees = [
            a.get("displayName") or a.get("email") or ""
            for a in (item.get("attendees") or [])
        ]
        attendee_str = ", ".join(attendees) if attendees else "—"
        lines = [
            f"[{item_id}] {title} ({itype})",
            f"  Start: {start}  End: {end}",
            f"  Location: {location} | Status: {status}",
            f"  Attendees: {attendee_str}",
        ]
        if desc:
            lines.append(f"  Description:\n{desc[:500]}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error fetching calendar item {item_id}: {e}"


@tool(
    description=(
        "Search calendar events and tasks by keyword. "
        "Scans titles, descriptions, and locations for the query term. "
        "Returns matching items with their IDs — use the ID with update or delete tools."
    )
)
def search_calendar_events_tool(
    query: Annotated[str, "Keyword or phrase to search for in calendar events"],
    config: RunnableConfig,
) -> str:
    auth_token = _get_auth_token(config)
    if not auth_token:
        return "No auth token available."
    try:
        items = list_calendar_items(auth_token)
        terms = {t.lower() for t in query.split() if len(t) > 2}
        matches = []
        for item in items:
            haystack = " ".join(
                filter(
                    None,
                    [
                        item.get("title"),
                        item.get("descriptionMarkdown"),
                        item.get("location"),
                    ],
                )
            ).lower()
            if any(t in haystack for t in terms):
                matches.append(item)
        if not matches:
            return f"No calendar items found matching '{query}'."
        lines = [f"Calendar items matching '{query}':"]
        for item in matches:
            item_id = item.get("id", "")
            title = item.get("title", "Untitled")
            itype = item.get("type", "")
            start = item.get("startAt") or item.get("dueDate") or "—"
            desc = (item.get("descriptionMarkdown") or "")[:200].replace("\n", " ")
            attendees = [
                a.get("displayName") or a.get("email") or ""
                for a in (item.get("attendees") or [])
            ]
            attendee_str = ", ".join(attendees) if attendees else "—"
            lines.append(
                f"  [{item_id}] {title} ({itype}) — {start}\n"
                f"    Attendees: {attendee_str}\n"
                f"    {desc}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching calendar items: {e}"


def _calendar_item_summary(item: dict) -> str:
    title = item.get("title", "Untitled")
    item_id = item.get("id", "")
    itype = item.get("type", "")
    start = item.get("startAt") or item.get("dueDate") or "—"
    end = item.get("endAt") or ""
    return f"[{item_id}] {title} ({itype}) Start: {start} End: {end}"


def _remove_none_values(payload: dict) -> dict:
    return {key: value for key, value in payload.items() if value is not None}


@tool(
    description=(
        "Create a calendar event, meeting, or task. "
        "Use only when the user explicitly asks to add something to the calendar. "
        "EVENT and MEETING require start_at and end_at. TASK can use due_date."
    )
)
def create_calendar_item_tool(
    title: Annotated[str, "Calendar item title"],
    type: Annotated[str, "Calendar item type: EVENT, MEETING, or TASK"],
    config: RunnableConfig,
    visibility: Annotated[str, "Calendar visibility: PERSONAL or COMPANY"] = "PERSONAL",
    description_markdown: Annotated[str | None, "Optional description or notes"] = None,
    location: Annotated[str | None, "Optional location"] = None,
    start_at: Annotated[str | None, "Start time in ISO 8601 format"] = None,
    end_at: Annotated[str | None, "End time in ISO 8601 format"] = None,
    all_day: Annotated[bool | None, "Whether this is an all-day item"] = None,
    task_status: Annotated[str | None, "Task status: TODO or DONE"] = None,
    due_date: Annotated[str | None, "Task due date in ISO 8601 format"] = None,
    attendee_ids: Annotated[list[str] | None, "Optional workspace user IDs to invite"] = None,
    room_id: Annotated[str | None, "Optional office room ID"] = None,
    wiki_page_id: Annotated[str | None, "Optional wiki page ID for notes"] = None,
) -> str:
    auth_token = _get_auth_token(config)
    if not auth_token:
        return "No auth token available."
    if not title.strip():
        return "Cannot create a calendar item without a title."

    payload = _remove_none_values(
        {
            "type": type.upper(),
            "visibility": visibility.upper(),
            "title": title,
            "descriptionMarkdown": description_markdown,
            "location": location,
            "startAt": start_at,
            "endAt": end_at,
            "allDay": all_day,
            "taskStatus": task_status.upper() if task_status else None,
            "dueDate": due_date,
            "attendeeIds": attendee_ids,
            "roomId": room_id,
            "wikiPageId": wiki_page_id,
        }
    )

    try:
        item = create_calendar_item(auth_token, payload)
        return f"Calendar item created: {_calendar_item_summary(item)}"
    except Exception as e:
        return f"Error creating calendar item: {e}"


@tool(
    description=(
        "Update an existing calendar item by ID. "
        "Use list_calendar_events_tool or search_calendar_events_tool first if the item ID is unknown."
    )
)
def update_calendar_item_tool(
    item_id: Annotated[str, "Calendar item ID to update"],
    config: RunnableConfig,
    title: Annotated[str | None, "New title"] = None,
    type: Annotated[str | None, "New item type: EVENT, MEETING, or TASK"] = None,
    visibility: Annotated[str | None, "New visibility: PERSONAL or COMPANY"] = None,
    description_markdown: Annotated[str | None, "New description or notes"] = None,
    location: Annotated[str | None, "New location"] = None,
    start_at: Annotated[str | None, "New start time in ISO 8601 format"] = None,
    end_at: Annotated[str | None, "New end time in ISO 8601 format"] = None,
    all_day: Annotated[bool | None, "Whether this is an all-day item"] = None,
    task_status: Annotated[str | None, "New task status: TODO or DONE"] = None,
    due_date: Annotated[str | None, "New task due date in ISO 8601 format"] = None,
    attendee_ids: Annotated[list[str] | None, "Replacement workspace user IDs to invite"] = None,
    room_id: Annotated[str | None, "New office room ID"] = None,
    wiki_page_id: Annotated[str | None, "New wiki page ID"] = None,
) -> str:
    auth_token = _get_auth_token(config)
    if not auth_token:
        return "No auth token available."
    if not item_id.strip():
        return "Cannot update a calendar item without an item ID."

    payload = _remove_none_values(
        {
            "type": type.upper() if type else None,
            "visibility": visibility.upper() if visibility else None,
            "title": title,
            "descriptionMarkdown": description_markdown,
            "location": location,
            "startAt": start_at,
            "endAt": end_at,
            "allDay": all_day,
            "taskStatus": task_status.upper() if task_status else None,
            "dueDate": due_date,
            "attendeeIds": attendee_ids,
            "roomId": room_id or None,
            "wikiPageId": wiki_page_id or None,
        }
    )
    if not payload:
        return "No calendar changes were provided."

    try:
        item = update_calendar_item(auth_token, item_id, payload)
        return f"Calendar item updated: {_calendar_item_summary(item)}"
    except Exception as e:
        return f"Error updating calendar item {item_id}: {e}"


@tool(
    description=(
        "Delete an existing calendar item by ID. "
        "Use only when the user explicitly asks to delete or remove a calendar item."
    )
)
def delete_calendar_item_tool(
    item_id: Annotated[str, "Calendar item ID to delete"],
    config: RunnableConfig,
) -> str:
    auth_token = _get_auth_token(config)
    if not auth_token:
        return "No auth token available."
    if not item_id.strip():
        return "Cannot delete a calendar item without an item ID."

    try:
        result = delete_calendar_item(auth_token, item_id)
        if result.get("success"):
            return f"Calendar item {item_id} deleted."
        return f"Calendar delete request completed: {result}"
    except Exception as e:
        return f"Error deleting calendar item {item_id}: {e}"
