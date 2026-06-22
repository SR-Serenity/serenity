from collections.abc import Awaitable, Callable

from src.ai.v1.agents.calendar_agent.agent import calendar_agent_node
from src.ai.v1.agents.chat_agent.agent import chat_agent_node
from src.ai.v1.agents.contacts_agent.agent import contacts_agent_node
from src.ai.v1.agents.mail_agent.agent import mail_agent_node
from src.ai.v1.agents.schedule_agent.agent import schedule_agent_node
from src.ai.v1.agents.wiki_agent.agent import wiki_agent_node
from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import PipelineState


AgentNode = Callable[[PipelineState], dict | Awaitable[dict]]


def create_all_agent_nodes() -> dict[Domain, AgentNode]:
    return {
        Domain.CHAT_AGENT: chat_agent_node,
        Domain.WIKI_AGENT: wiki_agent_node,
        Domain.CALENDAR_AGENT: calendar_agent_node,
        Domain.CONTACTS_AGENT: contacts_agent_node,
        Domain.MAIL_AGENT: mail_agent_node,
        Domain.SCHEDULE_AGENT: schedule_agent_node,
    }


def get_agent_node_name(domain: Domain) -> str:
    return domain.value
