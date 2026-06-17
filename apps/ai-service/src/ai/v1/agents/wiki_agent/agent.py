from langchain.agents import create_agent
from langchain.agents.middleware import ModelRequest, dynamic_prompt
from langchain_openai import ChatOpenAI

from src.ai.v1.agents.wiki_agent.prompts import build_wiki_prompt
from src.ai.v1.agents.wiki_agent.tools import (
    edit_wiki_page_tool,
    get_wiki_page_tool,
    list_wiki_pages_tool,
    search_wiki_pages_tool,
)
from src.ai.v1.contexts.schemas.agent_context import AgentContext
from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import DomainAgentResponse, PipelineState
from src.api.internal.v1.schemas import ProposedAction
from src.core.config import settings


@dynamic_prompt
def _system_prompt(request: ModelRequest) -> str:
    return build_wiki_prompt(request.runtime.context)


_agent = create_agent(
    ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0),
    tools=[list_wiki_pages_tool, get_wiki_page_tool, search_wiki_pages_tool, edit_wiki_page_tool],
    middleware=[_system_prompt],
    context_schema=AgentContext,
)


def _extract_content(result) -> str:
    if isinstance(result, dict):
        msgs = result.get("messages", [])
        if msgs:
            return str(getattr(msgs[-1], "content", msgs[-1]))
        return str(result)
    return str(getattr(result, "content", result))


async def wiki_agent_node(state: PipelineState, **_) -> dict:
    raw = state.get("context", {})
    ctx = AgentContext(
        org_id=state["org_id"],
        user_id=state["user_id"],
        auth_token=state.get("auth_token") or "",
        user_context=raw.get("userContext", {}),
        time_zone=raw.get("timeZone", ""),
        wiki_page_id=raw.get("wikiPageId"),
    )
    try:
        result = await _agent.ainvoke({"messages": list(state["messages"])}, context=ctx)
        content = _extract_content(result)

        if ctx.pending_edit:
            action = ProposedAction(
                type="EDIT_WIKI_PAGE",
                payload=ctx.pending_edit,
                confidence=0.95,
                requires_confirmation=True,
            )
            return {"domain_agent_response": DomainAgentResponse(
                domain=Domain.WIKI_AGENT,
                proposed_actions=[action],
                text=content,
            )}

        return {"domain_agent_response": DomainAgentResponse(domain=Domain.WIKI_AGENT, text=content)}
    except Exception as error:
        return {"domain_agent_response": DomainAgentResponse(domain=Domain.WIKI_AGENT, error=str(error))}
