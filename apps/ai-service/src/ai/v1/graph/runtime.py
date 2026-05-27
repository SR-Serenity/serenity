"""Serenity AI graph runtime adapter."""

from dataclasses import dataclass, field

from langchain_core.messages import HumanMessage
from langgraph.types import Command

from src.ai.v1.graph.builder import get_main_graph
from src.ai.v1.memory.namespaces import make_thread_id
from src.api.internal.v1.schemas import ChatRequest, ChatResponse
from src.integrations.langfuse import callbacks, langchain_metadata, new_trace_id, span, trace_metadata


@dataclass
class RuntimeState:
    thread_messages: dict[str, list[str]] = field(default_factory=dict)
    user_memories: dict[tuple[str, str], list[str]] = field(default_factory=dict)
    workspace_facts: dict[str, list[str]] = field(default_factory=dict)


runtime_state = RuntimeState()


async def run_chat(payload: ChatRequest, *, auth_token: str | None = None) -> ChatResponse:
    thread_id = make_thread_id(
        payload.auth_context.org_id,
        payload.auth_context.user_id,
        payload.session_id,
    )
    trace_id = new_trace_id()
    metadata = trace_metadata(
        org_id=payload.auth_context.org_id,
        user_id=payload.auth_context.user_id,
        session_id=payload.session_id,
        thread_id=thread_id,
        entrypoint=payload.context.entrypoint,
        file_ids=payload.context.file_ids,
        conversation_id=payload.context.conversation_id,
        wiki_page_id=payload.context.wiki_page_id,
        meeting_id=payload.context.meeting_id,
    )
    thread_config = {"configurable": {"thread_id": thread_id}}
    run_config = {
        "callbacks": callbacks(),
        **thread_config,
        "metadata": langchain_metadata(metadata),
        "recursion_limit": 20,
    }

    graph = get_main_graph()
    latest_user_msg = _latest_user_message(payload)

    with span("chat.graph", metadata):
        runtime_state.thread_messages.setdefault(thread_id, []).append(latest_user_msg)

        # Check if this thread has a pending interrupt waiting for user input
        current_state = await graph.aget_state(thread_config)
        has_pending_interrupt = bool(current_state.next)

        if has_pending_interrupt:
            # Resume the interrupted graph with the user's answer
            final_state = await graph.ainvoke(
                Command(resume=latest_user_msg),
                config=run_config,
            )
        else:
            # Fresh graph invocation
            final_state = await graph.ainvoke(
                {
                    "org_id": payload.auth_context.org_id,
                    "user_id": payload.auth_context.user_id,
                    "session_id": payload.session_id,
                    "role": payload.auth_context.role,
                    "thread_id": thread_id,
                    "auth_token": auth_token,
                    "context": payload.context.model_dump(by_alias=True, exclude_none=True),
                    "messages": [
                        HumanMessage(content=message.content)
                        for message in payload.messages
                        if message.role == "user"
                    ],
                },
                config=run_config,
            )

    # Check if the graph is now paused waiting for more user input
    state_after = await graph.aget_state(thread_config)
    if state_after.next:
        interrupt_question = _extract_interrupt_question(state_after)
        return ChatResponse(
            answer=interrupt_question,
            thread_id=thread_id,
            trace_id=trace_id,
        )

    return ChatResponse(
        answer=final_state.get("answer", _fallback_answer()),
        thread_id=thread_id,
        sources=final_state.get("sources", []),
        proposed_actions=final_state.get("proposed_actions", []),
        trace_id=trace_id,
    )


def _extract_interrupt_question(state) -> str:
    """Pull the interrupt value (clarifying question) from a paused graph state."""
    for task in getattr(state, "tasks", []):
        for it in getattr(task, "interrupts", []):
            val = it.value
            if isinstance(val, str):
                return val
            if isinstance(val, dict):
                return val.get("question", str(val))
    return "Could you provide a bit more detail so I can help?"


def _fallback_answer() -> str:
    return "Serenity AI is connected. Send a workspace question or attach a file to begin."


def _latest_user_message(payload: ChatRequest) -> str:
    for message in reversed(payload.messages):
        if message.role == "user":
            return message.content.strip()
    return ""
