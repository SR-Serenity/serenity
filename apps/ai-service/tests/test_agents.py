from src.ai.v1.agents.registry import AGENTS, agent_health, propose_actions
from src.ai.v1.agents.workspace_qa.agent import _WORKSPACE_QA_TOOLS
from src.ai.v1.graph.builder import get_main_graph
from src.api.internal.v1.schemas import ChatMessage


def test_agent_registry_has_folder_per_initial_sub_agent() -> None:
    # WorkspaceQaAgent is now a react agent (create_agent) and lives in the intent
    # registry — not in AGENTS, which only tracks standalone/utility agents.
    assert set(AGENTS) == {
        "DocumentUnderstandingAgent",
        "ScheduleAgent",
        "MemoryWriterAgent",
    }
    assert all(item["status"] == "ready" for item in agent_health())


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


def test_workspace_qa_agent_has_mail_and_calendar_write_tools() -> None:
    tool_names = {tool.name for tool in _WORKSPACE_QA_TOOLS}

    assert {
        "send_email_tool",
        "create_calendar_item_tool",
        "update_calendar_item_tool",
        "delete_calendar_item_tool",
    } <= tool_names
