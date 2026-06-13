from collections.abc import Callable
from dataclasses import dataclass, field

from src.ai.v1.agents.chat_assist.agent import create_chat_assist_agent
from src.ai.v1.agents.schedule_agent import schedule_agent
from src.ai.v1.agents.workspace_qa import create_workspace_qa_agent
from src.ai.v1.contexts.schemas.enums import Domain


@dataclass
class IntentConfig:
    domain: Domain
    agent_factory: Callable
    description: str
    examples: list[str] = field(default_factory=list)


INTENT_REGISTRY: dict[Domain, IntentConfig] = {
    Domain.WORKSPACE_QA: IntentConfig(
        domain=Domain.WORKSPACE_QA,
        agent_factory=create_workspace_qa_agent,
        description="Workspace questions using tools and workspace context.",
        examples=["What did we decide?", "Find workspace context about onboarding."],
    ),
    Domain.SCHEDULE_AGENT: IntentConfig(
        domain=Domain.SCHEDULE_AGENT,
        agent_factory=lambda: schedule_agent,
        description="Extract proposal-first task, event, meeting, and room booking payloads.",
        examples=["Create a task for Linh due Friday.", "Schedule an event tomorrow at 2 PM.", "Schedule a meeting with a room for 8 people."],
    ),
    Domain.CHAT_ASSIST: IntentConfig(
        domain=Domain.CHAT_ASSIST,
        agent_factory=create_chat_assist_agent,
        description="Writing help, translation, summarization, task extraction from chat, and general conversational assistance.",
        examples=["Translate this to Vietnamese", "Help me write a professional reply", "Summarize the conversation", "Extract action items", "What should I say?"],
    ),
}


def get_all_domains() -> list[Domain]:
    return list(INTENT_REGISTRY)
