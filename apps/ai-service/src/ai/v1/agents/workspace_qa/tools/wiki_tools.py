"""Wiki tools for workspace QA agent."""

from typing import Annotated

from langchain.tools import tool
from langgraph.prebuilt.tool_node import ToolRuntime

from src.services.workspace_service import get_wiki_page, list_wiki_pages


@tool(
    description=(
        "List all accessible wiki pages in this workspace. "
        "Returns id, title, visibility, and a short content preview for each page. "
        "Use this to discover what knowledge articles exist before reading a specific one."
    )
)
def list_wiki_pages_tool(runtime: ToolRuntime) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        pages = list_wiki_pages(auth_token)
        if not pages:
            return "No wiki pages found."
        lines = ["Wiki pages:"]
        for p in pages:
            title = p.get("title", "Untitled")
            page_id = p.get("id", "")
            visibility = p.get("visibility", "")
            preview = (p.get("contentMarkdown") or "")[:120].replace("\n", " ")
            lines.append(f"  [{page_id}] {title} ({visibility}) — {preview}…")
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing wiki pages: {e}"


@tool(
    description=(
        "Read the full content of a specific wiki page by its ID. "
        "Returns the title and full markdown content. "
        "Use list_wiki_pages_tool first to find the page ID."
    )
)
def get_wiki_page_tool(
    runtime: ToolRuntime,
    page_id: Annotated[str, "The wiki page UUID to read"],
) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        page = get_wiki_page(auth_token, page_id)
        if not page:
            return f"Wiki page {page_id} not found."
        title = page.get("title", "Untitled")
        content = page.get("contentMarkdown") or ""
        updated = page.get("updatedAt", "")
        return f"# {title}\n_Last updated: {updated}_\n\n{content}"
    except Exception as e:
        return f"Error reading wiki page {page_id}: {e}"


@tool(
    description=(
        "Search wiki pages by keyword. "
        "Scans titles and content for the given query term and returns matching pages. "
        "Use this when you need to find knowledge about a specific topic."
    )
)
def search_wiki_pages_tool(
    runtime: ToolRuntime,
    query: Annotated[str, "Keyword or phrase to search for in wiki pages"],
) -> str:
    auth_token: str = runtime.context.get("auth_token", "")
    if not auth_token:
        return "No auth token available."
    try:
        pages = list_wiki_pages(auth_token)
        terms = {t.lower() for t in query.split() if len(t) > 2}
        matches = []
        for p in pages:
            haystack = (
                (p.get("title") or "") + " " + (p.get("contentMarkdown") or "")
            ).lower()
            if any(t in haystack for t in terms):
                matches.append(p)
        if not matches:
            return f"No wiki pages found matching '{query}'."
        lines = [f"Wiki pages matching '{query}':"]
        for p in matches:
            title = p.get("title", "Untitled")
            page_id = p.get("id", "")
            preview = (p.get("contentMarkdown") or "")[:200].replace("\n", " ")
            lines.append(f"  [{page_id}] {title}\n    {preview}…")
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching wiki pages: {e}"
