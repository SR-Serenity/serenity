from collections.abc import Callable

from src.ai.v1.agents.calendar_agent.agent import calendar_agent_node
from src.ai.v1.agents.chat_agent.agent import chat_agent_node
from src.ai.v1.agents.contacts_agent.agent import contacts_agent_node
from src.ai.v1.agents.mail_agent.agent import mail_agent_node
from src.ai.v1.agents.schedule_agent.agent import schedule_agent_node
from src.ai.v1.agents.wiki_agent.agent import wiki_agent_node
from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import DomainAgentResponse, PipelineState


def _chat_assist_node(state: PipelineState) -> dict:
    from src.ai.v1.agents.chat_assist.agent import create_chat_assist_agent

    agent = create_chat_assist_agent()
    text = _latest_user_text(state)
    result = agent.run(text)
    return {"domain_agent_response": DomainAgentResponse(domain=Domain.CHAT_ASSIST, text=result)}


def create_all_agent_nodes() -> dict[Domain, Callable[[PipelineState], dict]]:
    return {
        Domain.CHAT_AGENT: chat_agent_node,
        Domain.WIKI_AGENT: wiki_agent_node,
        Domain.CALENDAR_AGENT: calendar_agent_node,
        Domain.CONTACTS_AGENT: contacts_agent_node,
        Domain.MAIL_AGENT: mail_agent_node,
        Domain.CHAT_ASSIST: _chat_assist_node,
        Domain.SCHEDULE_AGENT: schedule_agent_node,
    }


def get_agent_node_name(domain: Domain) -> str:
    return domain.value


def _latest_user_text(state: PipelineState) -> str:
    for message in reversed(state["messages"]):
        if getattr(message, "type", None) == "human":
            return str(message.content)
    return ""
