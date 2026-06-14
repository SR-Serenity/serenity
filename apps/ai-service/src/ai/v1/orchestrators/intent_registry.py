from collections.abc import Callable
from dataclasses import dataclass, field

from src.ai.v1.agents.calendar_agent.agent import create_calendar_agent
from src.ai.v1.agents.chat_agent.agent import create_chat_agent
from src.ai.v1.agents.chat_assist.agent import create_chat_assist_agent
from src.ai.v1.agents.contacts_agent.agent import create_contacts_agent
from src.ai.v1.agents.mail_agent.agent import create_mail_agent
from src.ai.v1.agents.schedule_agent import schedule_agent
from src.ai.v1.agents.wiki_agent.agent import create_wiki_agent
from src.ai.v1.contexts.schemas.enums import Domain


@dataclass
class IntentConfig:
    domain: Domain
    agent_factory: Callable
    description: str
    examples: list[str] = field(default_factory=list)


INTENT_REGISTRY: dict[Domain, IntentConfig] = {
    Domain.WIKI_AGENT: IntentConfig(
        domain=Domain.WIKI_AGENT,
        agent_factory=create_wiki_agent,
        description="Read, search, summarize, or work with wiki pages and knowledge base articles.",
        examples=["Summarize this page", "Add a TL;DR", "What does the onboarding wiki say?"],
    ),
    Domain.CHAT_AGENT: IntentConfig(
        domain=Domain.CHAT_AGENT,
        agent_factory=create_chat_agent,
        description="Search, recap, or understand chat conversations and messages.",
        examples=["What did we discuss in #general?", "What did Alice say about the deadline?", "Recap this conversation"],
    ),
    Domain.CALENDAR_AGENT: IntentConfig(
        domain=Domain.CALENDAR_AGENT,
        agent_factory=create_calendar_agent,
        description="Query, update, or delete calendar events and tasks.",
        examples=["What meetings do I have today?", "Update my 3pm to 4pm", "Delete the standup on Friday"],
    ),
    Domain.CONTACTS_AGENT: IntentConfig(
        domain=Domain.CONTACTS_AGENT,
        agent_factory=create_contacts_agent,
        description="Find team members and contacts in the workspace directory.",
        examples=["Who is Bob?", "Find someone in marketing", "What's Alice's email?"],
    ),
    Domain.MAIL_AGENT: IntentConfig(
        domain=Domain.MAIL_AGENT,
        agent_factory=create_mail_agent,
        description="Read, search, or send emails.",
        examples=["Any emails about the contract?", "Send an email to John", "Show my recent emails"],
    ),
    Domain.SCHEDULE_AGENT: IntentConfig(
        domain=Domain.SCHEDULE_AGENT,
        agent_factory=lambda: schedule_agent,
        description="Create new calendar items — tasks, events, meetings, or room bookings.",
        examples=["Create a task for Linh due Friday", "Schedule a meeting with a room for 8 people"],
    ),
    Domain.CHAT_ASSIST: IntentConfig(
        domain=Domain.CHAT_ASSIST,
        agent_factory=create_chat_assist_agent,
        description="Writing help, translation, grammar — no workspace data needed.",
        examples=["Translate this to Vietnamese", "Help me write a professional reply", "Fix the grammar"],
    ),
}


def get_all_domains() -> list[Domain]:
    return list(INTENT_REGISTRY)
