from typing import Literal

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from src.ai.v1.agents.memory_writer import memory_writer_agent
from src.ai.v1.contexts.schemas.state import PipelineState
from src.ai.v1.graph.agent_factory import create_all_agent_nodes, get_agent_node_name
from src.ai.v1.guardrails.input_guardrail import validate_input
from src.ai.v1.guardrails.output_guardrail import validate_output
from src.ai.v1.orchestrators.intent_classifier import classify_intent
from src.ai.v1.orchestrators.intent_registry import INTENT_REGISTRY
from src.ai.v1.orchestrators.router import route_to_agents
from src.ai.v1.synthesizer.synthesizer import synthesizer_node


def input_guardrail_node(state: PipelineState) -> dict:
    user_input = _latest_user_text(state)
    return {
        "input_guardrail": validate_input(user_input),
        "domain_agent_response": [],
        "proposed_actions": [],
    }


def context_loader_node(state: PipelineState) -> dict:
    return {"context": state.get("context", {})}


def memory_retriever_node(state: PipelineState) -> dict:
    from src.ai.v1.graph.runtime import runtime_state

    memories = runtime_state.user_memories.get((state["org_id"], state["user_id"]), [])
    return {"memories": list(memories)}


def intent_classification_node(state: PipelineState) -> dict:
    result = classify_intent(state)
    return {"detected_intent": result, "detected_language": result.language}


def action_planner_node(state: PipelineState) -> dict:
    proposed_actions = [
        action
        for response in state.get("domain_agent_response", [])
        for action in response.proposed_actions
    ]
    return {"proposed_actions": proposed_actions}


def memory_writer_node(state: PipelineState) -> dict:
    from src.ai.v1.graph.runtime import runtime_state
    from langchain_core.messages import HumanMessage, AIMessage

    user_key = (state["org_id"], state["user_id"])
    memories = runtime_state.user_memories.setdefault(user_key, [])

    # Extract explicit user memories
    user_text = _latest_user_text(state)
    explicit_memory = memory_writer_agent.extract(user_text)
    if explicit_memory and explicit_memory not in memories:
        memories.append(explicit_memory)

    # Also try to extract implicit context from latest exchange
    messages = state.get("messages", [])
    if len(messages) >= 2:
        # Find latest user and assistant message
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

    # Keep memories to recent 15 items to avoid bloat
    if len(memories) > 15:
        runtime_state.user_memories[user_key] = memories[-15:]

    return {}


def output_guardrail_node(state: PipelineState) -> dict:
    result = validate_output(state)
    update: dict = {"output_guardrail": result}
    if not result.is_safe:
        update["answer"] = "I cannot return that response safely."
    return update


def route_input_guardrail(state: PipelineState) -> Literal["context_loader", "synthesizer"]:
    if state.get("input_guardrail") and state["input_guardrail"].is_safe:
        return "context_loader"
    return "synthesizer"


def route_intent_classification(state: PipelineState):
    detected = state.get("detected_intent")
    return route_to_agents(detected.intent if detected else None, state)


def create_main_graph(checkpointer=None, store=None):
    graph = StateGraph(PipelineState)

    graph.add_node("input_guardrail", input_guardrail_node)
    graph.add_node("context_loader", context_loader_node)
    graph.add_node("memory_retriever", memory_retriever_node)
    graph.add_node("intent_classification", intent_classification_node)

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
        {
            "context_loader": "context_loader",
            "synthesizer": "synthesizer",
        },
    )
    graph.add_edge("context_loader", "memory_retriever")
    graph.add_edge("memory_retriever", "intent_classification")
    graph.add_conditional_edges("intent_classification", route_intent_classification)

    for domain in {config.domain for config in INTENT_REGISTRY.values()}:
        graph.add_edge(get_agent_node_name(domain), "action_planner")

    graph.add_edge("action_planner", "synthesizer")
    graph.add_edge("synthesizer", "memory_writer")
    graph.add_edge("memory_writer", "output_guardrail")
    graph.add_edge("output_guardrail", END)

    compile_kwargs = {}
    if checkpointer is not None:
        compile_kwargs["checkpointer"] = checkpointer
    if store is not None:
        compile_kwargs["store"] = store
    return graph.compile(**compile_kwargs)


_memory = MemorySaver()
_main_graph = None


def get_main_graph(checkpointer=None, store=None):
    global _main_graph
    if _main_graph is None:
        _main_graph = create_main_graph(checkpointer=checkpointer or _memory, store=store)
    return _main_graph


def _latest_user_text(state: PipelineState) -> str:
    for message in reversed(state["messages"]):
        if getattr(message, "type", None) == "human":
            return str(message.content)
    return ""
