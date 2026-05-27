from src.ai.v1.agents.registry import AGENTS, agent_health, propose_actions
from src.ai.v1.graph.builder import get_main_graph
from src.api.internal.v1.schemas import ChatMessage


def test_agent_registry_has_folder_per_initial_sub_agent() -> None:
    # WorkspaceQaAgent is now a react agent (create_agent) and lives in the intent
    # registry — not in AGENTS, which only tracks standalone/utility agents.
    assert set(AGENTS) == {
        "DocumentUnderstandingAgent",
        "TaskCreatorAgent",
        "MeetingSchedulerAgent",
        "MemoryWriterAgent",
    }
    assert all(item["status"] == "ready" for item in agent_health())


def test_action_agents_can_run_standalone_proposals() -> None:
    actions = propose_actions(
        [
            ChatMessage(
                role="user",
                content="Create a task and schedule a meeting with a room for 8 people",
            )
        ]
    )

    assert [action.type for action in actions] == ["CREATE_TASK", "BOOK_ROOM"]


def test_main_graph_is_langgraph_compiled_graph() -> None:
    graph = get_main_graph()

    assert hasattr(graph, "ainvoke")
    assert "intent_classification" in graph.get_graph().nodes
    assert "task_creator" in graph.get_graph().nodes
    assert "meeting_scheduler" in graph.get_graph().nodes
