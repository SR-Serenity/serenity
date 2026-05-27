"""Contact directory tools for workspace QA agent."""

from typing import Annotated

from langchain.tools import tool
from langgraph.prebuilt.tool_node import ToolRuntime

from src.services.workspace_service import list_contacts


@tool(
    description=(
        "List all contacts in the workspace directory. "
        "Returns name, email, phone, company, title, and status for each contact. "
        "Use this to find people's contact info or to answer questions about the team."
    )
)
def list_contacts_tool(runtime: ToolRuntime) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        contacts = list_contacts(auth_token)
        if not contacts:
            return "No contacts found."
        lines = ["Contacts:"]
        for c in contacts:
            name = c.get("displayName", "Unknown")
            email = c.get("email") or "—"
            phone = c.get("phone") or "—"
            company = c.get("company") or "—"
            title = c.get("title") or "—"
            ctype = c.get("type", "")
            status = c.get("status", "")
            lines.append(
                f"  {name} ({ctype}/{status}) | {email} | {phone} | {company} — {title}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing contacts: {e}"


@tool(
    description=(
        "Search the workspace contact directory by name, email, company, or title. "
        "Returns matching contacts with full details. "
        "Use this to find a specific person or look up someone's details."
    )
)
def search_contacts_tool(
    runtime: ToolRuntime,
    query: Annotated[str, "Name, email, company, or title to search for"],
) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        contacts = list_contacts(auth_token)
        terms = {t.lower() for t in query.split() if len(t) > 1}
        matches = []
        for c in contacts:
            haystack = " ".join(
                filter(
                    None,
                    [
                        c.get("displayName"),
                        c.get("email"),
                        c.get("company"),
                        c.get("title"),
                        c.get("role"),
                    ],
                )
            ).lower()
            if any(t in haystack for t in terms):
                matches.append(c)
        if not matches:
            return f"No contacts found matching '{query}'."
        lines = [f"Contacts matching '{query}':"]
        for c in matches:
            name = c.get("displayName", "Unknown")
            email = c.get("email") or "—"
            phone = c.get("phone") or "—"
            company = c.get("company") or "—"
            title = c.get("title") or "—"
            role = c.get("role") or "—"
            notes = c.get("notes") or ""
            lines.append(
                f"  {name}\n"
                f"    Email: {email} | Phone: {phone}\n"
                f"    Company: {company} | Title: {title} | Role: {role}"
            )
            if notes:
                lines.append(f"    Notes: {notes[:200]}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching contacts: {e}"
