from collections.abc import Callable
from dataclasses import dataclass, field

from src.ai.v1.agents.document_understanding import document_agent
from src.ai.v1.agents.meeting_scheduler import meeting_scheduler_agent
from src.ai.v1.agents.task_creator import task_creator_agent
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
    Domain.DOCUMENT_UNDERSTANDING: IntentConfig(
        domain=Domain.DOCUMENT_UNDERSTANDING,
        agent_factory=lambda: document_agent,
        description="Uploaded file and document understanding with citations.",
        examples=["Summarize this file.", "What does the PDF say about expenses?"],
    ),
    Domain.TASK_CREATOR: IntentConfig(
        domain=Domain.TASK_CREATOR,
        agent_factory=lambda: task_creator_agent,
        description="Extract proposal-first task creation payloads.",
        examples=["Create a task for Linh due Friday."],
    ),
    Domain.MEETING_SCHEDULER: IntentConfig(
        domain=Domain.MEETING_SCHEDULER,
        agent_factory=lambda: meeting_scheduler_agent,
        description="Extract proposal-first meeting and room booking payloads.",
        examples=["Schedule a meeting with a room for 8 people."],
    ),
}


def get_all_domains() -> list[Domain]:
    return list(INTENT_REGISTRY)
