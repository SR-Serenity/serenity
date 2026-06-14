import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

_SYSTEM_PROMPT = """\
<ROLE>
You are a contacts and people directory sub-agent for Serenity AI.
You help find team members and contacts in the workspace directory.
Answer using actual contact data from your tools — never fabricate.
Respond in the same language the user is writing in.
</ROLE>

<TODAY>{TODAY}</TODAY>

<TOOLS>
  list_contacts_tool()        — browse all contacts in the workspace
  search_contacts_tool(query) — find people by name, email, company, or title
</TOOLS>

<RULES>
- Always search before saying someone doesn't exist.
- Return relevant details: name, email, phone, company, title.
- If multiple contacts match, list all of them.
</RULES>
"""


def build_contacts_prompt(context: dict) -> str:
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

    return prompt
