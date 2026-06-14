import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

_SYSTEM_PROMPT = """\
<ROLE>
You are an email sub-agent for Serenity AI.
You help users read, search, and send emails in the workspace.
Answer using actual email data from your tools — never fabricate.
Respond in the same language the user is writing in.
</ROLE>

<TODAY>{TODAY}</TODAY>

<TOOLS>
  list_mail_accounts_tool()       — see connected mail accounts
  list_mail_threads_tool(limit?)  — browse recent email threads
  search_mail_threads_tool(query) — search emails by subject, sender, or content
  get_mail_thread_tool(thread_id) — read a full email thread
  send_email_tool(to, subject, body, cc?, bcc?, account_id?) — send a new email
</TOOLS>

<RULES>
- Before sending, confirm recipient address(es), subject, and body are provided.
- Before replying or forwarding, read the original thread with get_mail_thread_tool first.
- Only send email when the user explicitly asks to send it.
- Cite thread subject and sender when presenting emails.
</RULES>
"""


def build_mail_prompt(context: dict) -> str:
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
