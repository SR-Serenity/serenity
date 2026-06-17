from langchain.agents import create_agent
from langchain.agents.middleware import ModelRequest, dynamic_prompt
from langchain_openai import ChatOpenAI

from src.ai.v1.agents.contacts_agent.prompts import build_contacts_prompt
from src.ai.v1.agents.contacts_agent.tools import list_contacts_tool, search_contacts_tool
from src.ai.v1.contexts.schemas.agent_context import AgentContext
from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import DomainAgentResponse, PipelineState
from src.core.config import settings


@dynamic_prompt
def _system_prompt(request: ModelRequest) -> str:
    return build_contacts_prompt(request.runtime.context)


_agent = create_agent(
    ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0),
    tools=[list_contacts_tool, search_contacts_tool],
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


async def contacts_agent_node(state: PipelineState, **_) -> dict:
    raw = state.get("context", {})
    ctx = AgentContext(
        org_id=state["org_id"],
        user_id=state["user_id"],
        auth_token=state.get("auth_token") or "",
        user_context=raw.get("userContext", {}),
        time_zone=raw.get("timeZone", ""),
    )
    try:
        result = await _agent.ainvoke({"messages": list(state["messages"])}, context=ctx)
        return {"domain_agent_response": DomainAgentResponse(domain=Domain.CONTACTS_AGENT, text=_extract_content(result))}
    except Exception as error:
        return {"domain_agent_response": DomainAgentResponse(domain=Domain.CONTACTS_AGENT, error=str(error))}
