from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.store.base import BaseStore

from src.ai.v1.agents.memory_writer import memory_writer_agent
from src.ai.v1.contexts.schemas.state import PipelineState
from src.ai.v1.graph.agent_factory import create_all_agent_nodes, get_agent_node_name
from src.ai.v1.guardrails.input_guardrail import validate_input
from src.ai.v1.guardrails.output_guardrail import validate_output
from src.ai.v1.memory.namespaces import user_preferences_namespace
from src.ai.v1.orchestrators.intent_classifier import classify_intent
from src.ai.v1.orchestrators.intent_registry import INTENT_REGISTRY
from src.ai.v1.orchestrators.router import route_to_agents
from src.ai.v1.synthesizer.synthesizer import synthesizer_node

_MEMORIES_KEY = "user_memories"
_MAX_MEMORIES = 15


def input_guardrail_node(state: PipelineState) -> dict:
    user_input = _latest_user_text(state)
    return {
        "input_guardrail": validate_input(user_input),
        "domain_agent_response": [],
        "proposed_actions": [],
    }


def context_loader_node(state: PipelineState) -> dict:
    return {"context": state.get("context", {})}


def intent_classification_node(state: PipelineState) -> dict:
    result = classify_intent(state)
    return {"detected_intent": result, "detected_language": result.language}


def memory_dispatcher_node(state: PipelineState, store: BaseStore) -> dict:
    """Load long-term memories only when the intent classifier flagged needs_memory."""
    detected = state.get("detected_intent")
    if not detected or not detected.needs_memory:
        return {}

    ns = user_preferences_namespace(state["org_id"], state["user_id"])
    item = store.get(ns, _MEMORIES_KEY)
    memories: list[str] = item.value.get("memories", []) if item else []
    if not memories:
        return {"memories": []}

    memory_text = "\n".join(f"• {m}" for m in memories)
    system_msg = SystemMessage(
        content=(
            "[Long-term user context — use when relevant]\n"
            + memory_text
        )
    )
    return {"messages": [system_msg], "memories": memories}


def action_planner_node(state: PipelineState) -> dict:
    proposed_actions = [
        action
        for response in state.get("domain_agent_response", [])
        for action in response.proposed_actions
    ]
    return {"proposed_actions": proposed_actions}


def memory_writer_node(state: PipelineState, store: BaseStore) -> dict:
    """Persist new memories extracted from this exchange into the store."""
    ns = user_preferences_namespace(state["org_id"], state["user_id"])
    item = store.get(ns, _MEMORIES_KEY)
    memories: list[str] = list(item.value.get("memories", [])) if item else []

    user_text = _latest_user_text(state)
    explicit_memory = memory_writer_agent.extract(user_text)
    if explicit_memory and explicit_memory not in memories:
        memories.append(explicit_memory)

    messages = state.get("messages", [])
    if len(messages) >= 2:
        user_msg = None
        assistant_msg = None
        for msg in reversed(messages):
            if isinstance(msg, HumanMessage) and not user_msg:
                user_msg = msg.content
            elif isinstance(msg, AIMessage) and not assistant_msg:
                assistant_msg = msg.content
            if user_msg and assistant_msg:
                break

        if user_msg and assistant_msg:
            implicit_memory = memory_writer_agent.extract_from_exchange(user_msg, assistant_msg)
            if implicit_memory and implicit_memory not in memories:
                memories.append(implicit_memory)

    memories = memories[-_MAX_MEMORIES:]
    store.put(ns, _MEMORIES_KEY, {"memories": memories})
    return {}


def output_guardrail_node(state: PipelineState) -> dict:
    result = validate_output(state)
    update: dict = {"output_guardrail": result}
    if not result.is_safe:
        update["answer"] = "I cannot return that response safely."
    return update


def route_input_guardrail(state: PipelineState):
    if state.get("input_guardrail") and state["input_guardrail"].is_safe:
        return "context_loader"
    return "synthesizer"


def route_after_memory(state: PipelineState):
    """Route to agents (or synthesizer) after the memory dispatcher runs."""
    detected = state.get("detected_intent")
    return route_to_agents(detected.intent if detected else None, state)


def create_main_graph(checkpointer=None, store=None):
    graph = StateGraph(PipelineState)

    graph.add_node("input_guardrail", input_guardrail_node)
    graph.add_node("context_loader", context_loader_node)
    graph.add_node("intent_classification", intent_classification_node)
    graph.add_node("memory_dispatcher", memory_dispatcher_node)

    agent_nodes = create_all_agent_nodes()
    for domain, node_func in agent_nodes.items():
        graph.add_node(get_agent_node_name(domain), node_func)

    graph.add_node("action_planner", action_planner_node)
    graph.add_node("synthesizer", synthesizer_node)
    graph.add_node("memory_writer", memory_writer_node)
    graph.add_node("output_guardrail", output_guardrail_node)

    graph.add_edge(START, "input_guardrail")
    graph.add_conditional_edges(
        "input_guardrail",
        route_input_guardrail,
        {"context_loader": "context_loader", "synthesizer": "synthesizer"},
    )
    graph.add_edge("context_loader", "intent_classification")
    # Intent classification always flows into memory_dispatcher.
    # The dispatcher is a no-op when needs_memory=False — cheap conditional,
    # no extra LLM call.
    graph.add_edge("intent_classification", "memory_dispatcher")
    graph.add_conditional_edges("memory_dispatcher", route_after_memory)

    for domain in {config.domain for config in INTENT_REGISTRY.values()}:
        graph.add_edge(get_agent_node_name(domain), "action_planner")

    graph.add_edge("action_planner", "synthesizer")
    graph.add_edge("synthesizer", "memory_writer")
    graph.add_edge("memory_writer", "output_guardrail")
    graph.add_edge("output_guardrail", END)

    compile_kwargs: dict = {}
    if checkpointer is not None:
        compile_kwargs["checkpointer"] = checkpointer
    if store is not None:
        compile_kwargs["store"] = store
    return graph.compile(**compile_kwargs)


_main_graph = None


async def get_main_graph():
    global _main_graph
    if _main_graph is None:
        from src.ai.v1.memory.postgres import create_checkpointer, create_store

        _main_graph = create_main_graph(
            checkpointer=await create_checkpointer(),
            store=await create_store(),
        )
    return _main_graph


def _latest_user_text(state: PipelineState) -> str:
    for message in reversed(state["messages"]):
        if getattr(message, "type", None) == "human":
            return str(message.content)
    return ""
