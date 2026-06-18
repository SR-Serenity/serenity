"""Sub-agent registry for health checks and standalone access."""

from src.api.internal.v1.schemas import ChatMessage, ProposedAction
from src.ai.v1.agents.memory_writer import memory_writer_agent
from src.ai.v1.agents.task_extractor import task_extractor_agent
from src.ai.v1.agents.types import StandaloneAgent


class ScheduleStandaloneAgent:
    name = "ScheduleAgent"

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}


schedule_standalone_agent = ScheduleStandaloneAgent()

AGENTS: dict[str, StandaloneAgent] = {
    schedule_standalone_agent.name: schedule_standalone_agent,
    memory_writer_agent.name: memory_writer_agent,
    task_extractor_agent.name: task_extractor_agent,
}


def agent_health() -> list[dict[str, str]]:
    return [agent.health() for agent in AGENTS.values()]


def propose_actions(messages: list[ChatMessage]) -> list[ProposedAction]:
    text = " ".join(message.content.lower() for message in messages)
    if "room" in text and "meeting" in text:
        return [
            ProposedAction(
                type="BOOK_ROOM",
                payload={"title": "Meeting", "attendees": 8},
                confidence=0.7,
            )
        ]
    if "event" in text or "schedule" in text:
        return [
            ProposedAction(
                type="CREATE_EVENT",
                payload={"title": "Event"},
                confidence=0.7,
            )
        ]
    if "task" in text or "review" in text:
        return [
            ProposedAction(
                type="CREATE_TASK",
                payload={"title": "Follow up"},
                confidence=0.7,
            )
        ]
    return []
