from langchain.agents import create_agent
from langchain.agents.middleware import ModelRequest, dynamic_prompt
from langchain_openai import ChatOpenAI

from src.ai.v1.agents.calendar_agent.prompts import build_calendar_prompt
from src.ai.v1.agents.calendar_agent.tools import (
    create_calendar_item_tool,
    delete_calendar_item_tool,
    get_calendar_item_tool,
    list_calendar_events_tool,
    search_calendar_events_tool,
    update_calendar_item_tool,
)
from src.ai.v1.contexts.schemas.agent_context import AgentContext
from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import DomainAgentResponse, PipelineState, RawAgentData
from src.core.config import settings


@dynamic_prompt
def _system_prompt(request: ModelRequest[AgentContext]) -> str:
    return build_calendar_prompt(request.runtime.context)


_agent = create_agent(
    ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0),
    tools=[
        list_calendar_events_tool,
        get_calendar_item_tool,
        search_calendar_events_tool,
        create_calendar_item_tool,
        update_calendar_item_tool,
        delete_calendar_item_tool,
    ],
    middleware=[_system_prompt],
    response_format=RawAgentData,
    context_schema=AgentContext,
    name="calendar_agent",
)


async def calendar_agent_node(state: PipelineState, **_) -> dict:
    raw = state.get("context", {})
    ctx = AgentContext(
        org_id=state["org_id"],
        user_id=state["user_id"],
        auth_token=state.get("auth_token") or "",
        user_context=raw.get("userContext", {}),
        time_zone=raw.get("timeZone", ""),
        task_id=raw.get("taskId"),
        active_task=raw.get("activeTask"),
    )
    try:
        result = await _agent.ainvoke({"messages": list(state["messages"])}, context=ctx)
        raw_data: RawAgentData = result["structured_response"]
        return {
            "domain_agent_response": DomainAgentResponse(
                domain=Domain.CALENDAR_AGENT,
                text=raw_data.content,
            )
        }
    except Exception as error:
        return {
            "domain_agent_response": DomainAgentResponse(
                domain=Domain.CALENDAR_AGENT,
                error=str(error),
            )
        }
