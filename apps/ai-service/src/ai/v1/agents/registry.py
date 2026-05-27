"""Sub-agent registry for graph orchestration and standalone access."""

from src.ai.v1.agents.document_understanding import document_agent
from src.ai.v1.agents.meeting_scheduler import meeting_scheduler_agent
from src.ai.v1.agents.memory_writer import memory_writer_agent
from src.ai.v1.agents.task_creator import task_creator_agent
from src.ai.v1.agents.types import StandaloneAgent
from src.api.internal.v1.schemas import ChatMessage, ProposedAction

AGENTS: dict[str, StandaloneAgent] = {
    document_agent.name: document_agent,
    task_creator_agent.name: task_creator_agent,
    meeting_scheduler_agent.name: meeting_scheduler_agent,
    memory_writer_agent.name: memory_writer_agent,
}


def agent_health() -> list[dict[str, str]]:
    return [agent.health() for agent in AGENTS.values()]


def propose_actions(messages: list[ChatMessage]) -> list[ProposedAction]:
    proposals = [
        task_creator_agent.propose(messages),
        meeting_scheduler_agent.propose(messages),
    ]
    return [proposal for proposal in proposals if proposal is not None]
