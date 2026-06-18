"""Sub-agent registry for health checks and standalone access."""

from src.ai.v1.agents.memory_writer import memory_writer_agent
from src.ai.v1.agents.task_extractor import task_extractor_agent
from src.ai.v1.agents.types import StandaloneAgent

AGENTS: dict[str, StandaloneAgent] = {
    memory_writer_agent.name: memory_writer_agent,
    task_extractor_agent.name: task_extractor_agent,
}


def agent_health() -> list[dict[str, str]]:
    return [agent.health() for agent in AGENTS.values()]
