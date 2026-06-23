from langchain.agents import create_agent
from langchain.agents.middleware import ModelRequest, dynamic_prompt
from langchain_openai import ChatOpenAI

from src.ai.v1.agents.chat_agent.tools import (
    get_conversation_messages_tool,
    list_conversations_tool,
    search_messages_tool,
)
from src.ai.v1.agents.schedule_agent.prompts import build_system_prompt
from src.ai.v1.agents.schedule_agent.tools import (
    list_calendar_items_tool,
    propose_calendar_update_tool,
    propose_event_tool,
    propose_meeting_tool,
    propose_room_booking_tool,
    propose_task_tool,
)
from src.ai.v1.contexts.schemas.agent_context import AgentContext
from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import DomainAgentResponse, PipelineState, RawAgentData
from src.api.internal.v1.schemas import ProposedAction
from src.core.config import openai_api_key_secret, settings


@dynamic_prompt
def _system_prompt(request: ModelRequest[AgentContext]) -> str:
    return build_system_prompt(request.runtime.context)


_agent = create_agent(
    ChatOpenAI(model=settings.OPENAI_MODEL, api_key=openai_api_key_secret(), temperature=0),
    tools=[
        propose_task_tool,
        propose_event_tool,
        propose_meeting_tool,
        propose_room_booking_tool,
        propose_calendar_update_tool,
        list_calendar_items_tool,
        list_conversations_tool,
        get_conversation_messages_tool,
        search_messages_tool,
    ],
    middleware=[_system_prompt],
    response_format=RawAgentData,
    context_schema=AgentContext,
    name="schedule_agent",
)


async def schedule_agent_node(state: PipelineState, **_) -> dict:
    raw = state.get("context", {})
    ctx = AgentContext(
        org_id=state["org_id"],
        user_id=state["user_id"],
        auth_token=state.get("auth_token") or "",
        user_context=raw.get("userContext", {}),
        time_zone=raw.get("timeZone", ""),
        conversation_id=raw.get("conversationId"),
    )
    try:
        result = await _agent.ainvoke({"messages": list(state["messages"])}, context=ctx)
        raw_data: RawAgentData = result["structured_response"]

        proposed_actions: list[ProposedAction] = []
        if ctx.pending_proposal:
            proposed_actions = [ProposedAction(**ctx.pending_proposal)]

        return {
            "domain_agent_response": DomainAgentResponse(
                domain=Domain.SCHEDULE_AGENT,
                text=raw_data.content,
                proposed_actions=proposed_actions,
            )
        }
    except Exception as error:
        return {
            "domain_agent_response": DomainAgentResponse(
                domain=Domain.SCHEDULE_AGENT,
                error=str(error),
            )
        }
