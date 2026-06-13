"""Sub-agent registry for graph orchestration and standalone access."""

from src.ai.v1.agents.memory_writer import memory_writer_agent
from src.ai.v1.agents.schedule_agent import schedule_agent
from src.ai.v1.agents.task_extractor import task_extractor_agent
from src.ai.v1.agents.wiki_editor import wiki_editor_agent
from src.ai.v1.agents.types import StandaloneAgent
from src.api.internal.v1.schemas import ChatMessage, ProposedAction

AGENTS: dict[str, StandaloneAgent] = {
    schedule_agent.name: schedule_agent,
    memory_writer_agent.name: memory_writer_agent,
    wiki_editor_agent.name: wiki_editor_agent,
    task_extractor_agent.name: task_extractor_agent,
}


def agent_health() -> list[dict[str, str]]:
    return [agent.health() for agent in AGENTS.values()]


def propose_actions(messages: list[ChatMessage]) -> list[ProposedAction]:
    proposals = [
        schedule_agent.propose(messages),
    ]
    return [proposal for proposal in proposals if proposal is not None]
