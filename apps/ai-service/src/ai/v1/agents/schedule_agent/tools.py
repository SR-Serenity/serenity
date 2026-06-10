"""Proposal tools for the schedule agent.

Each tool records a single ProposedAction in the shared agent_context dict rather
than mutating core-service directly. The frontend confirms before anything is written.
"""

from typing import Annotated

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from src.api.internal.v1.schemas import ProposedAction
from src.services.workspace_service import list_calendar_items


def _get_agent_context(config: RunnableConfig) -> dict:
    return config.get("configurable", {}).get("agent_context", {})


@tool(
    description=(
        "Propose creating a task or to-do item. "
        "Use when the user wants to track a piece of work with an optional due date and assignee."
    )
)
def propose_task_tool(
    title: Annotated[str, "Concise task title (max 80 chars)"],
    config: RunnableConfig,
    description: Annotated[str | None, "Optional fuller description"] = None,
    due_date: Annotated[str | None, "Optional due date in ISO 8601 format (e.g. 2026-06-15)"] = None,
    assignee: Annotated[str | None, "Optional assignee name"] = None,
) -> str:
    context = _get_agent_context(config)
    context["proposed_action"] = ProposedAction(
        type="CREATE_TASK",
        confidence=0.9,
        payload={
            "title": title,
            "description": description,
            "dueDate": due_date,
            "assignee": assignee,
        },
    )
    return f"Task proposal ready: '{title}'."


@tool(
    description=(
        "Propose creating a calendar event or time block. "
        "Use when the user wants to block time on the calendar — not a meeting with attendees."
    )
)
def propose_event_tool(
    title: Annotated[str, "Short event title"],
    config: RunnableConfig,
    start_at: Annotated[str | None, "Start datetime in ISO 8601 without timezone offset (e.g. 2026-06-15T10:00:00)"] = None,
    end_at: Annotated[str | None, "End datetime in ISO 8601 without timezone offset"] = None,
    location: Annotated[str | None, "Optional location"] = None,
) -> str:
    context = _get_agent_context(config)
    context["proposed_action"] = ProposedAction(
        type="CREATE_EVENT",
        confidence=0.9,
        payload={
            "title": title,
            "startAt": start_at,
            "endAt": end_at,
            "location": location,
        },
    )
    return f"Event proposal ready: '{title}'."


@tool(
    description=(
        "Propose creating a meeting — a call, interview, sync, standup, or collaborative appointment with attendees."
    )
)
def propose_meeting_tool(
    title: Annotated[str, "Short meeting title"],
    config: RunnableConfig,
    start_at: Annotated[str | None, "Start datetime in ISO 8601 without timezone offset"] = None,
    end_at: Annotated[str | None, "End datetime in ISO 8601 without timezone offset"] = None,
    attendee_names: Annotated[list[str] | None, "Names of attendees"] = None,
    location: Annotated[str | None, "Room or location"] = None,
) -> str:
    context = _get_agent_context(config)
    context["proposed_action"] = ProposedAction(
        type="CREATE_MEETING",
        confidence=0.9,
        payload={
            "title": title,
            "startAt": start_at,
            "endAt": end_at,
            "attendeeNames": attendee_names or [],
            "location": location,
        },
    )
    return f"Meeting proposal ready: '{title}'."


@tool(description="Propose booking a room for a meeting or event.")
def propose_room_booking_tool(
    title: Annotated[str, "Short booking title"],
    config: RunnableConfig,
    start_at: Annotated[str | None, "Start datetime in ISO 8601 without timezone offset"] = None,
    end_at: Annotated[str | None, "End datetime in ISO 8601 without timezone offset"] = None,
    attendee_names: Annotated[list[str] | None, "Names of attendees"] = None,
    location: Annotated[str | None, "Room name or location"] = None,
) -> str:
    context = _get_agent_context(config)
    context["proposed_action"] = ProposedAction(
        type="BOOK_ROOM",
        confidence=0.9,
        payload={
            "title": title,
            "startAt": start_at,
            "endAt": end_at,
            "attendeeNames": attendee_names or [],
            "location": location,
        },
    )
    return f"Room booking proposal ready: '{title}'."


@tool(
    description=(
        "Propose updating an existing calendar item (event, meeting, or task). "
        "Use list_calendar_items_tool first to find the item ID if unknown."
    )
)
def propose_calendar_update_tool(
    item_id: Annotated[str, "Existing calendar item ID"],
    item_type: Annotated[str, "Item type: EVENT, MEETING, or TASK"],
    config: RunnableConfig,
    title: Annotated[str | None, "Updated title"] = None,
    start_at: Annotated[str | None, "New start datetime in ISO 8601 without timezone offset"] = None,
    end_at: Annotated[str | None, "New end datetime in ISO 8601 without timezone offset"] = None,
    description: Annotated[str | None, "Updated description"] = None,
    location: Annotated[str | None, "Updated location"] = None,
    attendee_names: Annotated[list[str] | None, "Replacement attendee names"] = None,
) -> str:
    context = _get_agent_context(config)
    context["proposed_action"] = ProposedAction(
        type="UPDATE_CALENDAR_ITEM",
        confidence=0.9,
        payload={
            "itemId": item_id,
            "itemType": item_type,
            "title": title,
            "startAt": start_at,
            "endAt": end_at,
            "descriptionMarkdown": description,
            "location": location,
            "attendeeNames": attendee_names or [],
        },
    )
    return f"Calendar update proposal ready for item '{item_id}'."


@tool(
    description=(
        "List existing calendar items so you can find IDs for updates or rescheduling. "
        "Filter by date range to narrow results."
    )
)
def list_calendar_items_tool(
    config: RunnableConfig,
    start_at: Annotated[str | None, "Start of date range in ISO 8601 format"] = None,
    end_at: Annotated[str | None, "End of date range in ISO 8601 format"] = None,
) -> str:
    auth_token: str = _get_agent_context(config).get("auth_token", "")
    if not auth_token:
        return "No auth token available — cannot look up calendar items."
    try:
        items = list_calendar_items(auth_token, start_at=start_at, end_at=end_at)
        if not items:
            return "No calendar items found in that range."
        lines = ["Calendar items:"]
        for item in items:
            item_id = item.get("id", "")
            title = item.get("title", "Untitled")
            itype = item.get("type", "")
            start = item.get("startAt") or item.get("dueDate") or "—"
            lines.append(f"  [{item_id}] {title} ({itype}) — {start}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing calendar items: {e}"
