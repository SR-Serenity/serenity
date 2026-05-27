"""Mail tools for workspace QA agent."""

from typing import Annotated

from langchain.tools import tool
from langgraph.prebuilt.tool_node import ToolRuntime

from src.services.workspace_service import get_mail_thread, list_mail_accounts, list_mail_threads


@tool(
    description=(
        "List connected mail accounts for this workspace. "
        "Returns account email addresses and their status. "
        "Use this to see which mail accounts are available."
    )
)
def list_mail_accounts_tool(runtime: ToolRuntime) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        accounts = list_mail_accounts(auth_token)
        if not accounts:
            return "No mail accounts connected."
        lines = ["Mail accounts:"]
        for a in accounts:
            email = a.get("email") or a.get("address") or "Unknown"
            provider = a.get("provider") or a.get("type") or "—"
            status = a.get("status") or "—"
            lines.append(f"  {email} ({provider}) — {status}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing mail accounts: {e}"


@tool(
    description=(
        "List recent mail threads (email conversations). "
        "Returns subject, sender, snippet, date, and thread ID. "
        "Use this to browse recent emails or find a specific thread."
    )
)
def list_mail_threads_tool(
    runtime: ToolRuntime,
    limit: Annotated[int, "Maximum number of threads to return (default 20)"] = 20,
) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        threads = list_mail_threads(auth_token, limit=limit)
        if not threads:
            return "No mail threads found."
        lines = ["Mail threads:"]
        for t in threads:
            tid = t.get("id", "")
            subject = t.get("subject") or "(no subject)"
            sender = t.get("from") or t.get("senderName") or "Unknown"
            snippet = (t.get("snippet") or t.get("preview") or "")[:150]
            date = t.get("date") or t.get("receivedAt") or "—"
            lines.append(f"  [{tid}] {subject}\n    From: {sender} | {date}\n    {snippet}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing mail threads: {e}"


@tool(
    description=(
        "Search mail threads by keyword across subject, sender, and snippet. "
        "Returns matching threads with their details. "
        "Use this to find specific emails or email conversations."
    )
)
def search_mail_threads_tool(
    runtime: ToolRuntime,
    query: Annotated[str, "Keyword or phrase to search for in mail threads"],
) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        threads = list_mail_threads(auth_token, limit=50)
        terms = {t.lower() for t in query.split() if len(t) > 2}
        matches = []
        for t in threads:
            haystack = " ".join(
                filter(
                    None,
                    [
                        t.get("subject"),
                        t.get("from"),
                        t.get("senderName"),
                        t.get("snippet"),
                        t.get("preview"),
                    ],
                )
            ).lower()
            if any(term in haystack for term in terms):
                matches.append(t)
        if not matches:
            return f"No mail threads found matching '{query}'."
        lines = [f"Mail threads matching '{query}':"]
        for t in matches:
            tid = t.get("id", "")
            subject = t.get("subject") or "(no subject)"
            sender = t.get("from") or t.get("senderName") or "Unknown"
            snippet = (t.get("snippet") or t.get("preview") or "")[:200]
            date = t.get("date") or t.get("receivedAt") or "—"
            lines.append(f"  [{tid}] {subject}\n    From: {sender} | {date}\n    {snippet}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching mail: {e}"


@tool(
    description=(
        "Read the full content of a specific mail thread by its ID. "
        "Returns all messages in the thread with sender, date, and body. "
        "Use list_mail_threads_tool first to find the thread ID."
    )
)
def get_mail_thread_tool(
    runtime: ToolRuntime,
    thread_id: Annotated[str, "The mail thread ID to read"],
) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        thread = get_mail_thread(auth_token, thread_id)
        if not thread:
            return f"Mail thread {thread_id} not found."
        subject = thread.get("subject") or "(no subject)"
        messages = thread.get("messages") or []
        lines = [f"Thread: {subject}"]
        for m in messages:
            sender = m.get("from") or m.get("senderName") or "Unknown"
            date = m.get("date") or m.get("sentAt") or "—"
            body = (m.get("body") or m.get("text") or "")[:500]
            lines.append(f"\n--- From: {sender} | {date} ---\n{body}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error reading mail thread {thread_id}: {e}"
