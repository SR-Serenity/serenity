"""LLM-powered schedule agent."""

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from src.ai.v1.agents.schedule_agent.prompts import build_system_prompt
from src.ai.v1.agents.schedule_agent.tools import (
    list_calendar_items_tool,
    propose_calendar_update_tool,
    propose_event_tool,
    propose_meeting_tool,
    propose_room_booking_tool,
    propose_task_tool,
)
from src.api.internal.v1.schemas import ChatMessage, ProposedAction
from src.core.config import settings

_SCHEDULE_TOOLS = [
    propose_task_tool,
    propose_event_tool,
    propose_meeting_tool,
    propose_room_booking_tool,
    propose_calendar_update_tool,
    list_calendar_items_tool,
]


class ScheduleAgent:
    name = "ScheduleAgent"

    def __init__(self) -> None:
        self._agent = create_react_agent(
            ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0,
            ),
            tools=_SCHEDULE_TOOLS,
        )

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def needs_clarification(
        self,
        messages: list[ChatMessage],
        context: dict | None = None,
    ) -> str | None:
        return None

    def propose(
        self,
        messages: list[ChatMessage],
        context: dict | None = None,
    ) -> ProposedAction | None:
        context = context or {}
        agent_context: dict = {
            "auth_token": context.get("auth_token", ""),
            "timeZone": context.get("timeZone", ""),
        }
        system_message = SystemMessage(content=build_system_prompt(context))
        lc_messages = [system_message] + [
            HumanMessage(content=m.content) if m.role == "user" else AIMessage(content=m.content)
            for m in messages
            if m.role in ("user", "assistant")
        ]
        self._agent.invoke(
            {"messages": lc_messages},
            config={"configurable": {"agent_context": agent_context}},
        )
        return agent_context.get("proposed_action")
