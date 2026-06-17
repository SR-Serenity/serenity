from collections.abc import Callable

from src.ai.v1.agents.calendar_agent.agent import calendar_agent_node
from src.ai.v1.agents.chat_agent.agent import chat_agent_node
from src.ai.v1.agents.contacts_agent.agent import contacts_agent_node
from src.ai.v1.agents.mail_agent.agent import mail_agent_node
from src.ai.v1.agents.wiki_agent.agent import wiki_agent_node
from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import DomainAgentResponse, PipelineState


def _chat_assist_node(state: PipelineState) -> dict:
    from src.ai.v1.agents.chat_assist.agent import create_chat_assist_agent
    agent = create_chat_assist_agent()
    text = _latest_user_text(state)
    result = agent.run(text)
    return {"domain_agent_response": DomainAgentResponse(domain=Domain.CHAT_ASSIST, text=result)}


async def _schedule_agent_node(state: PipelineState) -> dict:
    from langgraph.types import interrupt
    from src.ai.v1.agents.schedule_agent import schedule_agent
    from src.api.internal.v1.schemas import ChatMessage

    messages = [
        ChatMessage(role="user" if getattr(m, "type", None) == "human" else "assistant", content=str(m.content))
        for m in state.get("messages", [])
    ]
    context = {**state.get("context", {}), "auth_token": state.get("auth_token") or ""}
    clarification = schedule_agent.needs_clarification(messages, context=context) if hasattr(schedule_agent, "needs_clarification") else None
    if clarification:
        messages = messages + [ChatMessage(role="user", content=str(interrupt(clarification)))]
    proposal = schedule_agent.propose(messages, context=context)
    return {"domain_agent_response": DomainAgentResponse(
        domain=Domain.SCHEDULE_AGENT,
        proposed_actions=[proposal] if proposal else [],
    )}


def create_all_agent_nodes() -> dict[Domain, Callable[[PipelineState], dict]]:
    return {
        Domain.CHAT_AGENT: chat_agent_node,
        Domain.WIKI_AGENT: wiki_agent_node,
        Domain.CALENDAR_AGENT: calendar_agent_node,
        Domain.CONTACTS_AGENT: contacts_agent_node,
        Domain.MAIL_AGENT: mail_agent_node,
        Domain.CHAT_ASSIST: _chat_assist_node,
        Domain.SCHEDULE_AGENT: _schedule_agent_node,
    }


def get_agent_node_name(domain: Domain) -> str:
    return domain.value


def _latest_user_text(state: PipelineState) -> str:
    for message in reversed(state["messages"]):
        if getattr(message, "type", None) == "human":
            return str(message.content)
    return ""
