"""Chat/conversation tools for workspace QA agent."""

from typing import Annotated

from langchain.tools import tool
from langgraph.prebuilt.tool_node import ToolRuntime

from src.services.workspace_service import list_conversations, list_messages


@tool(
    description=(
        "List all conversations (channels and direct messages) accessible to this user. "
        "Returns conversation ID, name/type, and member count. "
        "Use this to discover conversations before searching their messages."
    )
)
def list_conversations_tool(runtime: ToolRuntime) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        convs = list_conversations(auth_token)
        if not convs:
            return "No conversations found."
        lines = ["Conversations:"]
        for c in convs:
            cid = c.get("id", "")
            name = c.get("name") or c.get("displayName") or "DM"
            ctype = c.get("type", "")
            member_count = len(c.get("members") or [])
            lines.append(f"  [{cid}] {name} ({ctype}, {member_count} members)")
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing conversations: {e}"


@tool(
    description=(
        "Search messages across a specific conversation by keyword. "
        "Fetches recent messages and filters by the query term. "
        "Returns matching messages with sender and timestamp."
    )
)
def search_messages_tool(
    runtime: ToolRuntime,
    conversation_id: Annotated[str, "The conversation UUID to search in"],
    query: Annotated[str, "Keyword or phrase to search for in messages"],
) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        messages = list_messages(auth_token, conversation_id, limit=100)
        terms = {t.lower() for t in query.split() if len(t) > 2}
        matches = []
        for m in messages:
            content = (m.get("content") or m.get("text") or "").lower()
            if any(t in content for t in terms):
                matches.append(m)
        if not matches:
            return f"No messages found matching '{query}' in conversation {conversation_id}."
        lines = [f"Messages matching '{query}' in conversation {conversation_id}:"]
        for m in matches:
            sender = (
                (m.get("sender") or {}).get("displayName")
                or m.get("senderName")
                or "Unknown"
            )
            ts = m.get("createdAt") or m.get("sentAt") or ""
            text = (m.get("content") or m.get("text") or "")[:300]
            lines.append(f"  [{ts}] {sender}: {text}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching messages: {e}"


@tool(
    description=(
        "Search messages across ALL conversations by keyword. "
        "Looks through every conversation the user can access and finds messages matching the query. "
        "Returns the conversation name and matching messages. Useful for finding decisions, "
        "announcements, or context from any channel."
    )
)
def search_all_messages_tool(
    runtime: ToolRuntime,
    query: Annotated[str, "Keyword or phrase to search for across all conversations"],
) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        convs = list_conversations(auth_token)
        if not convs:
            return "No conversations accessible."
        terms = {t.lower() for t in query.split() if len(t) > 2}
        all_matches: list[str] = []
        for c in convs[:10]:
            cid = c.get("id", "")
            cname = c.get("name") or c.get("displayName") or "DM"
            try:
                messages = list_messages(auth_token, cid, limit=50)
            except Exception:
                continue
            for m in messages:
                content = (m.get("content") or m.get("text") or "").lower()
                if any(t in content for t in terms):
                    sender = (
                        (m.get("sender") or {}).get("displayName")
                        or m.get("senderName")
                        or "Unknown"
                    )
                    ts = m.get("createdAt") or m.get("sentAt") or ""
                    text = (m.get("content") or m.get("text") or "")[:300]
                    all_matches.append(f"  [{cname}] [{ts}] {sender}: {text}")
        if not all_matches:
            return f"No messages found matching '{query}' across all conversations."
        lines = [f"Messages matching '{query}':"] + all_matches[:20]
        if len(all_matches) > 20:
            lines.append(f"  … and {len(all_matches) - 20} more results")
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching all messages: {e}"
