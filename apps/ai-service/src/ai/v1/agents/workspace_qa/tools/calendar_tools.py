"""Calendar tools for workspace QA agent."""

from typing import Annotated

from langchain.tools import tool
from langgraph.prebuilt.tool_node import ToolRuntime

from src.services.workspace_service import list_calendar_items


@tool(
    description=(
        "List calendar events and tasks for this workspace. "
        "Returns title, type, start/end time, location, attendees, and status. "
        "Optionally filter by date range. Use ISO 8601 format for dates (e.g., 2025-06-01T00:00:00Z)."
    )
)
def list_calendar_events_tool(
    runtime: ToolRuntime,
    start_at: Annotated[
        str | None,
        "Optional start date filter in ISO 8601 format (e.g., 2025-06-01T00:00:00Z)",
    ] = None,
    end_at: Annotated[
        str | None,
        "Optional end date filter in ISO 8601 format (e.g., 2025-06-30T23:59:59Z)",
    ] = None,
) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
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
        "Search calendar events and tasks by keyword. "
        "Scans titles, descriptions, and locations for the query term. "
        "Use this to find meetings or tasks related to a specific topic."
    )
)
def search_calendar_events_tool(
    runtime: ToolRuntime,
    query: Annotated[str, "Keyword or phrase to search for in calendar events"],
) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
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
                f"  {title} ({itype}) — {start}\n"
                f"    Attendees: {attendee_str}\n"
                f"    {desc}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching calendar items: {e}"
