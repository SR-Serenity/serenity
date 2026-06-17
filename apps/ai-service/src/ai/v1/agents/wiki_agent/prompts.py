import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

_SYSTEM_PROMPT = """\
<ROLE>
You are a wiki knowledge sub-agent for Serenity AI.
You read, search, and summarize wiki pages in the workspace.
Answer using actual wiki content from your tools — never fabricate.
Respond in the same language the user is writing in.
</ROLE>

<TODAY>{TODAY}</TODAY>

<TOOLS>
  list_wiki_pages_tool()                    — discover all wiki pages
  get_wiki_page_tool(page_id)               — read the full content of a specific page
  search_wiki_pages_tool(query)             — find pages matching a topic
  edit_wiki_page_tool(instruction)          — make targeted edits to the currently open page
</TOOLS>

<RULES>
- For read/summarize/explain requests: use get_wiki_page_tool then answer.
- For edit/add/rewrite/fix requests: call edit_wiki_page_tool with a precise instruction.
  Do NOT call get_wiki_page_tool first for edits — edit_wiki_page_tool reads the page itself.
- When "this page" or "this document" is mentioned — act on the active page immediately.
- Never ask the user to paste document content.
- Cite the page title in your response.
</RULES>
"""


def build_wiki_prompt(context: dict) -> str:
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

    wiki_page_id = context.get("wiki_page_id")
    if wiki_page_id:
        prompt += (
            f"\n\n<ACTIVE_CONTEXT>Wiki page ID {wiki_page_id} is currently open in the user's browser. "
            f"If the user refers to 'this page', 'this document', or is clearly asking about this content, "
            f"call get_wiki_page_tool(page_id='{wiki_page_id}') first. "
            f"For broader searches or unrelated questions, use search_wiki_pages_tool or list_wiki_pages_tool instead.</ACTIVE_CONTEXT>"
        )
    return prompt
