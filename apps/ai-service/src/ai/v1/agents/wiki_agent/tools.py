"""Wiki tools for the wiki sub-agent."""

from typing import Annotated

from langchain.tools import ToolRuntime, tool

from src.ai.v1.agents.wiki_agent.editor import wiki_editor_logic
from src.ai.v1.contexts.schemas.agent_context import AgentContext
from src.ai.v1.documents.index_store import get_index_store
from src.services.workspace_service import get_wiki_page, list_wiki_pages


@tool(
    description=(
        "List all accessible wiki pages in this workspace. "
        "Returns id, title, visibility, and a short content preview for each page. "
        "Use this to discover what knowledge articles exist before reading a specific one."
    )
)
def list_wiki_pages_tool(runtime: ToolRuntime[AgentContext]) -> str:
    auth_token = runtime.context.auth_token
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
    page_id: Annotated[str, "The wiki page UUID to read"],
    runtime: ToolRuntime[AgentContext],
) -> str:
    auth_token = runtime.context.auth_token
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
    query: Annotated[str, "Keyword or phrase to search for in wiki pages"],
    runtime: ToolRuntime[AgentContext],
) -> str:
    auth_token = runtime.context.auth_token
    org_id = runtime.context.org_id
    if not auth_token:
        return "No auth token available."
    try:
        store = get_index_store()
        if org_id:
            results = store.search(org_id=org_id, source_type="wiki", query=query, limit=5)
            if results:
                lines = [f"Wiki pages matching '{query}':"]
                for result in results:
                    page = get_wiki_page(auth_token, result.source_id)
                    if not page:
                        continue
                    title = page.get("title", "Untitled")
                    heading = " > ".join(result.heading_path or [])
                    preview = (result.content or "")[:200].replace("\n", " ")
                    heading_text = f" ({heading})" if heading else ""
                    lines.append(f"  [{result.source_id}] {title}{heading_text}\n    {preview}…")
                if len(lines) > 1:
                    return "\n".join(lines)

        pages = list_wiki_pages(auth_token)
        terms = {t.lower() for t in query.split() if len(t) > 2}
        matches = []
        for p in pages:
            haystack = ((p.get("title") or "") + " " + (p.get("contentMarkdown") or "")).lower()
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


@tool(
    description=(
        "Edit the currently open wiki page based on an instruction. "
        "Call get_wiki_page_tool first to read the current content, then call this tool "
        "with your edit instruction. Makes targeted changes — preserves everything else. "
        "Use for: adding sections, rewriting paragraphs, adding TL;DR, fixing content."
    )
)
def edit_wiki_page_tool(
    instruction: Annotated[str, "What to change — be specific about the section and what to do"],
    runtime: ToolRuntime[AgentContext],
) -> str:
    ctx = runtime.context
    if not ctx.auth_token:
        return "No auth token available."
    if not ctx.wiki_page_id:
        return "No wiki page is currently open. Cannot edit."
    try:
        page = get_wiki_page(ctx.auth_token, ctx.wiki_page_id)
        if not page:
            return f"Wiki page {ctx.wiki_page_id} not found."
        page_title = page.get("title", "Untitled")
        page_content = page.get("contentMarkdown") or ""
        explanation, updated_content = wiki_editor_logic.edit(
            page_title=page_title,
            page_content_markdown=page_content,
            prompt=instruction,
        )
        ctx.pending_edit = {
            "pageId": ctx.wiki_page_id,
            "title": page_title,
            "contentMarkdown": updated_content,
        }
        return explanation
    except Exception as e:
        return f"Error editing wiki page: {e}"
