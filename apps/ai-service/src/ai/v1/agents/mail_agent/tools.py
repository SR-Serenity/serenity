"""Mail tools for workspace QA agent."""

from typing import Annotated

from langchain.tools import ToolRuntime, tool

from src.ai.v1.contexts.schemas.agent_context import AgentContext
from src.services.workspace_service import (
    get_mail_thread,
    list_mail_accounts,
    list_mail_threads,
    send_mail,
)


@tool(description="List connected mail accounts for this workspace.")
def list_mail_accounts_tool(runtime: ToolRuntime[AgentContext]) -> str:
    auth_token = runtime.context.auth_token
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


@tool(description="List recent mail threads (email conversations) with subject, sender, snippet, and date.")
def list_mail_threads_tool(
    runtime: ToolRuntime[AgentContext],
    limit: Annotated[int, "Maximum number of threads to return (default 20)"] = 20,
) -> str:
    auth_token = runtime.context.auth_token
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


@tool(description="Search mail threads by keyword across subject, sender, and snippet.")
def search_mail_threads_tool(
    query: Annotated[str, "Keyword or phrase to search for in mail threads"],
    runtime: ToolRuntime[AgentContext],
) -> str:
    auth_token = runtime.context.auth_token
    if not auth_token:
        return "No auth token available."
    try:
        threads = list_mail_threads(auth_token, limit=50)
        terms = {t.lower() for t in query.split() if len(t) > 2}
        matches = [
            t for t in threads
            if any(
                term in " ".join(filter(None, [t.get("subject"), t.get("from"), t.get("senderName"), t.get("snippet"), t.get("preview")])).lower()
                for term in terms
            )
        ]
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


@tool(description="Read the full content of a specific mail thread by ID. Returns all messages with sender, date, and body.")
def get_mail_thread_tool(
    thread_id: Annotated[str, "The mail thread ID to read"],
    runtime: ToolRuntime[AgentContext],
) -> str:
    auth_token = runtime.context.auth_token
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
        "Use only when the user explicitly asks to send an email."
    )
)
def send_email_tool(
    to: Annotated[list[str], "Recipient email addresses"],
    subject: Annotated[str, "Email subject"],
    body: Annotated[str, "Plain text email body"],
    runtime: ToolRuntime[AgentContext],
    cc: Annotated[list[str] | None, "Optional CC addresses"] = None,
    bcc: Annotated[list[str] | None, "Optional BCC addresses"] = None,
    account_id: Annotated[str | None, "Optional connected mail account ID to send from"] = None,
) -> str:
    auth_token = runtime.context.auth_token
    if not auth_token:
        return "No auth token available."
    if not to:
        return "Cannot send email without at least one recipient."
    if not subject.strip() or not body.strip():
        return "Cannot send email without a subject and body."
    payload: dict = {"to": to, "subject": subject, "body": body}
    if cc:
        payload["cc"] = cc
    if bcc:
        payload["bcc"] = bcc
    if account_id:
        payload["accountId"] = account_id
    try:
        result = send_mail(auth_token, payload)
        return f"Email sent to {', '.join(to)} with subject '{subject}'." if result.get("success") else f"Send result: {result}"
    except Exception as e:
        return f"Error sending email: {e}"
