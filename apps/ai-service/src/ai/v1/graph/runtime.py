"""Serenity AI graph runtime adapter."""

from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage
from langgraph.types import Command

from src.ai.v1.contexts.message_manager import ConversationContextManager
from src.ai.v1.graph.builder import get_main_graph
from src.ai.v1.memory.namespaces import make_thread_id
from src.api.internal.v1.schemas import ChatRequest, ChatResponse
from src.integrations.langfuse import callbacks, langchain_metadata, new_trace_id, span, trace_metadata


@dataclass
class RuntimeState:
    thread_messages: dict[str, list[str]] = field(default_factory=dict)
    user_memories: dict[tuple[str, str], list[str]] = field(default_factory=dict)
    workspace_facts: dict[str, list[str]] = field(default_factory=dict)
    context_manager: ConversationContextManager = field(
        default_factory=lambda: ConversationContextManager(max_tokens=8000, message_window=20)
    )


runtime_state = RuntimeState()


async def run_chat(payload: ChatRequest, *, auth_token: str | None = None) -> ChatResponse:
    prepared = await _prepare_run(payload, auth_token=auth_token)

    with span("chat.graph", prepared.metadata):
        if prepared.has_pending_interrupt:
            final_state = await prepared.graph.ainvoke(
                Command(resume=prepared.latest_user_msg),
                config=prepared.run_config,
            )
        else:
            final_state = await prepared.graph.ainvoke(
                prepared.graph_input,
                config=prepared.run_config,
            )

    state_after = await prepared.graph.aget_state(prepared.thread_config)
    if state_after.next:
        interrupt_question = _extract_interrupt_question(state_after)
        return ChatResponse(
            answer=interrupt_question,
            thread_id=prepared.thread_id,
            trace_id=prepared.trace_id,
        )

    return ChatResponse(
        answer=final_state.get("answer", _fallback_answer()),
        thread_id=prepared.thread_id,
        proposed_actions=final_state.get("proposed_actions", []),
        trace_id=prepared.trace_id,
    )


async def stream_chat(payload: ChatRequest, *, auth_token: str | None = None) -> AsyncIterator[dict]:
    prepared = await _prepare_run(payload, auth_token=auth_token)
    yield {"type": "start", "threadId": prepared.thread_id, "traceId": prepared.trace_id}

    streamed_answer = ""
    final_answer = _fallback_answer()
    proposed_actions: list[Any] = []

    # Nodes whose LLM output is the final user-facing response.
    # Synthesizer is included for the greeting/proposal-summary path.
    _STREAMING_NODES = {
        "chat_agent", "wiki_agent", "calendar_agent",
        "contacts_agent", "mail_agent", "synthesizer",
    }

    with span("chat.graph.stream", prepared.metadata):
        stream_input: Any = (
            Command(resume=prepared.latest_user_msg)
            if prepared.has_pending_interrupt
            else prepared.graph_input
        )
        async for part in prepared.graph.astream(
            stream_input,
            config=prepared.run_config,
            stream_mode=["messages", "updates"],
            version="v2",
        ):
            if part["type"] == "messages":
                message_chunk, metadata = part["data"]
                if metadata.get("langgraph_node") not in _STREAMING_NODES:
                    continue
                content = getattr(message_chunk, "content", "")
                if isinstance(content, str) and content:
                    streamed_answer += content
                    yield {"type": "token", "content": content}
            elif part["type"] == "updates":
                for _node_name, update in part["data"].items():
                    if not isinstance(update, dict):
                        continue
                    if "answer" in update:
                        final_answer = update["answer"] or final_answer
                    if "proposed_actions" in update:
                        proposed_actions = update["proposed_actions"] or []

    state_after = await prepared.graph.aget_state(prepared.thread_config)
    if state_after.next:
        final_answer = _extract_interrupt_question(state_after)
        proposed_actions = []
    else:
        values = getattr(state_after, "values", {}) or {}
        final_answer = values.get("answer", final_answer)
        proposed_actions = values.get("proposed_actions", proposed_actions)

    if final_answer and final_answer != streamed_answer:
        yield {"type": "answer", "answer": final_answer}

    yield {
        "type": "final",
        "answer": final_answer,
        "threadId": prepared.thread_id,
        "proposedActions": proposed_actions,
        "traceId": prepared.trace_id,
    }


@dataclass
class PreparedRun:
    graph: Any
    graph_input: dict
    has_pending_interrupt: bool
    latest_user_msg: str
    metadata: dict
    run_config: dict
    thread_config: dict
    thread_id: str
    trace_id: str | None


async def _prepare_run(payload: ChatRequest, *, auth_token: str | None = None) -> PreparedRun:
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
        conversation_id=payload.context.conversation_id,
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
    user_key = (payload.auth_context.org_id, payload.auth_context.user_id)
    user_context = _build_user_context(payload, auth_token=auth_token)

    runtime_state.thread_messages.setdefault(thread_id, []).append(latest_user_msg)

    converted_messages: list[AnyMessage] = [
        HumanMessage(content=message.content)
        if message.role == "user"
        else AIMessage(content=message.content)
        for message in payload.messages
    ]

    user_memories = runtime_state.user_memories.get(user_key, [])

    trimmed_messages, updated_memories = runtime_state.context_manager.trim_messages(
        converted_messages,
        org_id=payload.auth_context.org_id,
        user_id=payload.auth_context.user_id,
        memories=user_memories,
    )

    if updated_memories:
        runtime_state.user_memories[user_key] = updated_memories

    final_messages = runtime_state.context_manager.build_context_with_memories(
        trimmed_messages, memories=updated_memories
    )
    current_state = await graph.aget_state(thread_config)
    has_pending_interrupt = bool(current_state.next)

    return PreparedRun(
        graph=graph,
        graph_input={
            "org_id": payload.auth_context.org_id,
            "user_id": payload.auth_context.user_id,
            "session_id": payload.session_id,
            "role": payload.auth_context.role,
            "thread_id": thread_id,
            "auth_token": auth_token,
            "context": {
                **payload.context.model_dump(by_alias=True, exclude_none=True),
                "userContext": user_context,
            },
            "messages": final_messages,
        },
        has_pending_interrupt=has_pending_interrupt,
        latest_user_msg=latest_user_msg,
        metadata=metadata,
        run_config=run_config,
        thread_config=thread_config,
        thread_id=thread_id,
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
    return "Serenity AI is connected. Send a workspace question to begin."


def _latest_user_message(payload: ChatRequest) -> str:
    for message in reversed(payload.messages):
        if message.role == "user":
            return message.content.strip()
    return ""


def _build_user_context(payload: ChatRequest, *, auth_token: str | None) -> dict:
    member = None
    if auth_token:
        from src.services.workspace_service import get_current_member

        member = get_current_member(
            auth_token,
            payload.auth_context.org_id,
            payload.auth_context.user_id,
        )

    return {
        "user": {
            "id": payload.auth_context.user_id,
            "displayName": (member or {}).get("displayName") or payload.auth_context.display_name,
            "email": (member or {}).get("email") or payload.auth_context.email,
            "role": (member or {}).get("role") or payload.auth_context.role,
            "departmentId": (member or {}).get("departmentId"),
            "departmentName": (member or {}).get("departmentName"),
        },
        "organization": {
            "id": payload.auth_context.org_id,
            "name": payload.auth_context.org_name,
            "slug": payload.auth_context.org_slug,
        },
        "timeZone": payload.context.time_zone or "UTC",
    }
