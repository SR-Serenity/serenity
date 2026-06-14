import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

_SYSTEM_PROMPT = """\
<ROLE>
You are a calendar and task sub-agent for Serenity AI.
You query, create, update, and delete calendar events and tasks in the workspace.
Answer using actual calendar data from your tools — never fabricate.
Respond in the same language the user is writing in.
</ROLE>

<TODAY>{TODAY}</TODAY>

<TOOLS>
  list_calendar_events_tool(start_at?, end_at?) — list events and tasks in a date range
  get_calendar_item_tool(item_id)               — read full details of a specific item
  search_calendar_events_tool(query)            — find events by keyword
  create_calendar_item_tool(...)                — create an event, meeting, or task
  update_calendar_item_tool(item_id, ...)       — update an existing event or task
  delete_calendar_item_tool(item_id)            — delete an event or task
</TOOLS>

<RULES>
- When "this task" or "this event" is mentioned with an active item ID — fetch it immediately.
- Before updating or deleting, find the item ID using search or list tools if not provided.
- Only create, update, or delete when the user explicitly asks.
- Never call search_calendar_events_tool with empty query — use list_calendar_events_tool.
- Use ISO 8601 for all date/time values.
</RULES>
"""


def build_calendar_prompt(context: dict) -> str:
    tz_str = context.get("timeZone") or "UTC"
    try:
        tz = ZoneInfo(tz_str)
    except ZoneInfoNotFoundError:
        tz = datetime.timezone.utc
    today = datetime.datetime.now(tz).strftime("%Y-%m-%d %H:%M %Z")
    prompt = _SYSTEM_PROMPT.format(TODAY=today)

    user_name = (context.get("user_context") or {}).get("user", {}).get("displayName")
    if user_name:
        prompt += f"\n\n<CURRENT_USER>The person you are talking to is {user_name}. Always use 'you'/'your', never their name in third person.</CURRENT_USER>"

    active_task = context.get("active_task")
    if active_task:
        title = active_task.get("title", "Untitled")
        status = active_task.get("status", "—")
        priority = active_task.get("priority", "—")
        due_date = active_task.get("dueDate") or "—"
        assignee = active_task.get("assigneeName") or "—"
        description = (active_task.get("description") or "").strip()
        source = active_task.get("sourceType") or "—"
        task_block = (
            f"Title: {title}\n"
            f"Status: {status} | Priority: {priority} | Due: {due_date}\n"
            f"Assignee: {assignee} | Source: {source}"
        )
        if description:
            task_block += f"\nDescription: {description[:500]}"
        prompt += f"\n\n<ACTIVE_TASK>\n{task_block}\n</ACTIVE_TASK>"
    elif context.get("task_id"):
        prompt += (
            f"\n\n<ACTIVE_CONTEXT>Task/event ID {context['task_id']} is currently open. "
            f"Call get_calendar_item_tool(item_id='{context['task_id']}') FIRST before responding.</ACTIVE_CONTEXT>"
        )
    return prompt
