import pytest

from src.ai.v1.agents.registry import AGENTS, agent_health, propose_actions
from src.ai.v1.graph.builder import get_main_graph
from src.api.internal.v1.schemas import ChatMessage
from src.core.config import settings

requires_openai = pytest.mark.skipif(
    not settings.OPENAI_API_KEY,
    reason="OPENAI_API_KEY not configured",
)
integration = pytest.mark.skip(reason="integration test — requires live OpenAI responses")


def test_agent_registry_has_expected_standalone_agents() -> None:
    assert set(AGENTS) == {
        "ScheduleAgent",
        "MemoryWriterAgent",
        "TaskExtractorAgent",
    }
    assert all(item["status"] == "ready" for item in agent_health())


@integration
def test_action_agents_can_run_standalone_proposals() -> None:
    actions = propose_actions(
        [
            ChatMessage(
                role="user",
                content="Create a task to review the Q4 docs",
            )
        ]
    )

    assert [action.type for action in actions] == ["CREATE_TASK"]


@integration
def test_schedule_agent_creates_events_separately_from_tasks_and_meetings() -> None:
    actions = propose_actions(
        [
            ChatMessage(
                role="user",
                content="Schedule an event for the product launch tomorrow at 2pm",
            )
        ]
    )

    assert [action.type for action in actions] == ["CREATE_EVENT"]


@integration
def test_schedule_agent_creates_meetings_and_room_bookings() -> None:
    actions = propose_actions(
        [
            ChatMessage(
                role="user",
                content="Schedule a meeting with a room for 8 people",
            )
        ]
    )

    assert [action.type for action in actions] == ["BOOK_ROOM"]


def test_main_graph_is_langgraph_compiled_graph() -> None:
    graph = get_main_graph()

    assert hasattr(graph, "ainvoke")
    assert "intent_classification" in graph.get_graph().nodes
    assert "schedule_agent" in graph.get_graph().nodes
    assert "meeting_scheduler" not in graph.get_graph().nodes


def test_calendar_agent_has_expected_tools() -> None:
    from src.ai.v1.agents.calendar_agent.tools import (
        create_calendar_item_tool,
        delete_calendar_item_tool,
        get_calendar_item_tool,
        list_calendar_events_tool,
        search_calendar_events_tool,
        update_calendar_item_tool,
    )

    tool_names = {
        t.name for t in [
            list_calendar_events_tool,
            get_calendar_item_tool,
            search_calendar_events_tool,
            create_calendar_item_tool,
            update_calendar_item_tool,
            delete_calendar_item_tool,
        ]
    }

    assert {
        "create_calendar_item_tool",
        "update_calendar_item_tool",
        "delete_calendar_item_tool",
    } <= tool_names
