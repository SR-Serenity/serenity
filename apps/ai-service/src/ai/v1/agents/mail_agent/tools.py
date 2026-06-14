"""Mail tools for workspace QA agent."""

from typing import Annotated

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from src.services.workspace_service import (
    get_mail_thread,
    list_mail_accounts,
    list_mail_threads,
    send_mail,
)


def _get_auth_token(config: RunnableConfig) -> str:
    return config.get("configurable", {}).get("agent_context", {}).get("auth_token", "")


@tool(
    description=(
        "List connected mail accounts for this workspace. "
        "Returns account email addresses and their status. "
        "Use this to see which mail accounts are available."
    )
)
def list_mail_accounts_tool(config: RunnableConfig) -> str:
    auth_token = _get_auth_token(config)
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
    config: RunnableConfig,
    limit: Annotated[int, "Maximum number of threads to return (default 20)"] = 20,
) -> str:
    auth_token = _get_auth_token(config)
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
    query: Annotated[str, "Keyword or phrase to search for in mail threads"],
    config: RunnableConfig,
) -> str:
    auth_token = _get_auth_token(config)
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
    thread_id: Annotated[str, "The mail thread ID to read"],
    config: RunnableConfig,
) -> str:
    auth_token = _get_auth_token(config)
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


@tool(
    description=(
        "Send a new email from the user's connected mail account. "
        "Use only when the user explicitly asks to send an email and has provided "
        "the recipients, subject, and body."
    )
)
def send_email_tool(
    to: Annotated[list[str], "Recipient email addresses"],
    subject: Annotated[str, "Email subject"],
    body: Annotated[str, "Plain text email body"],
    config: RunnableConfig,
    cc: Annotated[list[str] | None, "Optional CC email addresses"] = None,
    bcc: Annotated[list[str] | None, "Optional BCC email addresses"] = None,
    account_id: Annotated[str | None, "Optional connected mail account ID to send from"] = None,
) -> str:
    auth_token = _get_auth_token(config)
    if not auth_token:
        return "No auth token available."
    if not to:
        return "Cannot send email without at least one recipient."
    if not subject.strip():
        return "Cannot send email without a subject."
    if not body.strip():
        return "Cannot send email without a body."

    payload: dict = {"to": to, "subject": subject, "body": body}
    if cc:
        payload["cc"] = cc
    if bcc:
        payload["bcc"] = bcc
    if account_id:
        payload["accountId"] = account_id

    try:
        result = send_mail(auth_token, payload)
        if result.get("success"):
            return f"Email sent to {', '.join(to)} with subject '{subject}'."
        return f"Email send request completed: {result}"
    except Exception as e:
        return f"Error sending email: {e}"
