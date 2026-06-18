"""Proposal tools for the schedule agent.

Each tool records a ProposedAction into AgentContext.pending_proposal.
The node reads it back after ainvoke — nothing is written to core-service directly.
"""

from typing import Annotated

from langchain.tools import ToolRuntime, tool

from src.ai.v1.contexts.schemas.agent_context import AgentContext
from src.api.internal.v1.schemas import ProposedAction
from src.services.workspace_service import list_calendar_items


@tool(
    description=(
        "Propose creating a task or to-do item. "
        "Use when the user wants to track work with an optional due date and assignee."
    )
)
def propose_task_tool(
    title: Annotated[str, "Concise task title (max 80 chars)"],
    runtime: ToolRuntime[AgentContext],
    description: Annotated[str | None, "Optional fuller description"] = None,
    due_date: Annotated[str | None, "Optional due date in ISO 8601 (e.g. 2026-06-15)"] = None,
    assignee: Annotated[str | None, "Optional assignee name"] = None,
) -> str:
    runtime.context.pending_proposal = ProposedAction(
        type="CREATE_TASK",
        confidence=0.9,
        payload={"title": title, "description": description, "dueDate": due_date, "assignee": assignee},
    ).model_dump()
    return f"Task proposal recorded: '{title}'."


@tool(
    description=(
        "Propose creating a calendar event or time block. "
        "Use when blocking time — not a meeting with attendees."
    )
)
def propose_event_tool(
    title: Annotated[str, "Short event title"],
    runtime: ToolRuntime[AgentContext],
    start_at: Annotated[str | None, "Start datetime ISO 8601 without timezone offset"] = None,
    end_at: Annotated[str | None, "End datetime ISO 8601 without timezone offset"] = None,
    location: Annotated[str | None, "Optional location"] = None,
) -> str:
    runtime.context.pending_proposal = ProposedAction(
        type="CREATE_EVENT",
        confidence=0.9,
        payload={"title": title, "startAt": start_at, "endAt": end_at, "location": location},
    ).model_dump()
    return f"Event proposal recorded: '{title}'."


@tool(
    description="Propose creating a meeting — a call, sync, standup, or appointment with attendees."
)
def propose_meeting_tool(
    title: Annotated[str, "Short meeting title"],
    runtime: ToolRuntime[AgentContext],
    start_at: Annotated[str | None, "Start datetime ISO 8601 without timezone offset"] = None,
    end_at: Annotated[str | None, "End datetime ISO 8601 without timezone offset"] = None,
    attendee_names: Annotated[list[str] | None, "Names of attendees"] = None,
    location: Annotated[str | None, "Room or location"] = None,
) -> str:
    runtime.context.pending_proposal = ProposedAction(
        type="CREATE_MEETING",
        confidence=0.9,
        payload={"title": title, "startAt": start_at, "endAt": end_at, "attendeeNames": attendee_names or [], "location": location},
    ).model_dump()
    return f"Meeting proposal recorded: '{title}'."


@tool(description="Propose booking a room for a meeting or event.")
def propose_room_booking_tool(
    title: Annotated[str, "Short booking title"],
    runtime: ToolRuntime[AgentContext],
    start_at: Annotated[str | None, "Start datetime ISO 8601 without timezone offset"] = None,
    end_at: Annotated[str | None, "End datetime ISO 8601 without timezone offset"] = None,
    attendee_names: Annotated[list[str] | None, "Names of attendees"] = None,
    location: Annotated[str | None, "Room name or location"] = None,
) -> str:
    runtime.context.pending_proposal = ProposedAction(
        type="BOOK_ROOM",
        confidence=0.9,
        payload={"title": title, "startAt": start_at, "endAt": end_at, "attendeeNames": attendee_names or [], "location": location},
    ).model_dump()
    return f"Room booking proposal recorded: '{title}'."


@tool(
    description=(
        "Propose updating an existing calendar item (event, meeting, or task). "
        "Use list_calendar_items_tool first to find the item ID if unknown."
    )
)
def propose_calendar_update_tool(
    item_id: Annotated[str, "Existing calendar item ID"],
    item_type: Annotated[str, "Item type: EVENT, MEETING, or TASK"],
    runtime: ToolRuntime[AgentContext],
    title: Annotated[str | None, "Updated title"] = None,
    start_at: Annotated[str | None, "New start datetime ISO 8601 without timezone offset"] = None,
    end_at: Annotated[str | None, "New end datetime ISO 8601 without timezone offset"] = None,
    description: Annotated[str | None, "Updated description"] = None,
    location: Annotated[str | None, "Updated location"] = None,
    attendee_names: Annotated[list[str] | None, "Replacement attendee names"] = None,
) -> str:
    runtime.context.pending_proposal = ProposedAction(
        type="UPDATE_CALENDAR_ITEM",
        confidence=0.9,
        payload={
            "itemId": item_id, "itemType": item_type,
            "title": title, "startAt": start_at, "endAt": end_at,
            "descriptionMarkdown": description, "location": location,
            "attendeeNames": attendee_names or [],
        },
    ).model_dump()
    return f"Calendar update proposal recorded for item '{item_id}'."


@tool(
    description=(
        "List existing calendar items to find IDs for updates or rescheduling. "
        "Filter by date range to narrow results."
    )
)
def list_calendar_items_tool(
    runtime: ToolRuntime[AgentContext],
    start_at: Annotated[str | None, "Start of date range ISO 8601"] = None,
    end_at: Annotated[str | None, "End of date range ISO 8601"] = None,
) -> str:
    auth_token = runtime.context.auth_token
    if not auth_token:
        return "No auth token available."
    try:
        items = list_calendar_items(auth_token, start_at=start_at, end_at=end_at)
        if not items:
            return "No calendar items found in that range."
        lines = ["Calendar items:"]
        for item in items:
            lines.append(
                f"  [{item.get('id', '')}] {item.get('title', 'Untitled')} "
                f"({item.get('type', '')}) — {item.get('startAt') or item.get('dueDate') or '—'}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing calendar items: {e}"
