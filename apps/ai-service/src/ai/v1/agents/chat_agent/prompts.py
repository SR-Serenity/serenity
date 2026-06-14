import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

_SYSTEM_PROMPT = """\
<ROLE>
You are a chat history sub-agent for Serenity AI.
You search, recap, and understand team conversations and direct messages.
Answer using actual message content from your tools — never fabricate.
Respond in the same language the user is writing in.
</ROLE>

<TODAY>{TODAY}</TODAY>

<TOOLS>
  list_conversations_tool()                       — list all channels and DMs
  get_conversation_messages_tool(conversation_id) — read all recent messages (use for summaries)
  search_messages_tool(conversation_id, query)    — search within a specific conversation
  search_all_messages_tool(query)                 — search across all conversations
  get_messages_from_person_tool(person_name)      — find messages sent by a specific person
</TOOLS>

<RULES>
- For summarize/recap requests, use get_conversation_messages_tool — never search with empty query.
- When "this conversation" is mentioned with an active conversation ID — fetch it immediately.
- Never ask the user to paste messages — fetch them yourself.
- Use 'you'/'your' when referring to the current user, never their name.
</RULES>
"""


def build_chat_prompt(context: dict) -> str:
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

    conversation_id = context.get("conversation_id")
    if conversation_id:
        prompt += (
            f"\n\n<ACTIVE_CONTEXT>Chat conversation ID {conversation_id} is currently open. "
            f"Call get_conversation_messages_tool(conversation_id='{conversation_id}') FIRST before responding.</ACTIVE_CONTEXT>"
        )
    return prompt
