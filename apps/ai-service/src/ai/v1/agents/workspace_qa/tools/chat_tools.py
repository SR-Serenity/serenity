"""Chat/conversation tools for workspace QA agent."""

from typing import Annotated

from langchain.tools import tool
from langgraph.prebuilt.tool_node import ToolRuntime

from src.services.workspace_service import list_conversations, list_messages


def _sender_name(m: dict) -> str:
    """Extract sender display name from a message dict.

    The API returns the author under the 'author' key with a 'displayName' field.
    Fall back to legacy 'sender' and 'senderName' fields for compatibility.
    """
    return (
        (m.get("author") or {}).get("displayName")
        or (m.get("sender") or {}).get("displayName")
        or m.get("senderName")
        or "Unknown"
    )


def _conv_display_name(c: dict) -> str:
    """Return a human-readable name for a conversation.

    For DMs with no channel name, list the members' display names instead.
    """
    name = c.get("name") or c.get("displayName")
    if name:
        return name
    members = c.get("members") or []
    member_names = [
        (m.get("user") or {}).get("displayName") or m.get("displayName") or ""
        for m in members
    ]
    member_names = [n for n in member_names if n]
    return ", ".join(member_names) if member_names else "DM"


def _name_matches(display_name: str, query: str) -> bool:
    """Case-insensitive substring match for person name lookup."""
    return query.lower() in display_name.lower()


@tool(
    description=(
        "List all conversations (channels and direct messages) accessible to this user. "
        "Returns conversation ID, name/type, member names, and member count. "
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
            ctype = c.get("type", "")
            members = c.get("members") or []
            member_names = [
                (m.get("user") or {}).get("displayName") or m.get("displayName") or ""
                for m in members
            ]
            member_names = [n for n in member_names if n]
            name = c.get("name") or c.get("displayName") or (", ".join(member_names) if member_names else "DM")
            members_str = f"members: {', '.join(member_names)}" if member_names else f"{len(members)} members"
            lines.append(f"  [{cid}] {name} ({ctype}, {members_str})")
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
        matches = [
            m for m in messages
            if any(t in (m.get("content") or m.get("text") or "").lower() for t in terms)
        ]
        if not matches:
            return f"No messages found matching '{query}' in conversation {conversation_id}."
        lines = [f"Messages matching '{query}' in conversation {conversation_id}:"]
        for m in matches:
            ts = m.get("createdAt") or m.get("sentAt") or ""
            text = (m.get("content") or m.get("text") or "")[:300]
            lines.append(f"  [{ts}] {_sender_name(m)}: {text}")
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
            cname = _conv_display_name(c)
            try:
                messages = list_messages(auth_token, cid, limit=50)
            except Exception:
                continue
            for m in messages:
                content = (m.get("content") or m.get("text") or "").lower()
                if any(t in content for t in terms):
                    ts = m.get("createdAt") or m.get("sentAt") or ""
                    text = (m.get("content") or m.get("text") or "")[:300]
                    all_matches.append(f"  [{cname}] [{ts}] {_sender_name(m)}: {text}")
        if not all_matches:
            return f"No messages found matching '{query}' across all conversations."
        lines = [f"Messages matching '{query}':"] + all_matches[:20]
        if len(all_matches) > 20:
            lines.append(f"  … and {len(all_matches) - 20} more results")
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching all messages: {e}"


@tool(
    description=(
        "Find recent messages sent by a specific person, identified by their name. "
        "Searches all conversations for members whose name matches the given name (case-insensitive, "
        "partial match allowed — e.g. 'Alice' matches 'Alice Marketing'). "
        "Use this when the user asks 'what did <person> send me?' or 'show messages from <person>'."
    )
)
def get_messages_from_person_tool(
    runtime: ToolRuntime,
    person_name: Annotated[str, "Name or partial name of the person to find messages from"],
) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        convs = list_conversations(auth_token)
        if not convs:
            return "No conversations accessible."

        # Find conversations that include a member whose name matches
        relevant_convs = []
        for c in convs:
            members = c.get("members") or []
            for mem in members:
                member_display = (mem.get("user") or {}).get("displayName") or mem.get("displayName") or ""
                if member_display and _name_matches(member_display, person_name):
                    relevant_convs.append((c, member_display))
                    break

        if not relevant_convs:
            return (
                f"No member found with a name matching '{person_name}'. "
                "Try listing conversations to see available members."
            )

        all_results: list[str] = []
        seen_senders: set[str] = set()
        for c, matched_name in relevant_convs[:5]:
            cid = c.get("id", "")
            cname = _conv_display_name(c)
            if matched_name not in seen_senders:
                seen_senders.add(matched_name)
            try:
                messages = list_messages(auth_token, cid, limit=50)
            except Exception:
                continue
            for m in messages:
                sender = _sender_name(m)
                if _name_matches(sender, person_name):
                    ts = m.get("createdAt") or m.get("sentAt") or ""
                    text = (m.get("content") or m.get("text") or "")[:300]
                    all_results.append(f"  [{cname}] [{ts}] {sender}: {text}")

        if not all_results:
            matched_str = ", ".join(seen_senders)
            return (
                f"Found member(s) matching '{person_name}' ({matched_str}) "
                "but they have no recent messages in accessible conversations."
            )

        header = f"Recent messages from '{person_name}':"
        lines = [header] + all_results[:20]
        if len(all_results) > 20:
            lines.append(f"  … and {len(all_results) - 20} more messages")
        return "\n".join(lines)
    except Exception as e:
        return f"Error finding messages from person: {e}"
