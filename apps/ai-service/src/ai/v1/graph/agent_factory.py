from collections.abc import Callable
from typing import Literal

from langchain_core.runnables import RunnableConfig

from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import DomainAgentResponse, PipelineState
from src.ai.v1.orchestrators.intent_registry import INTENT_REGISTRY


def create_agent_node(domain: Domain) -> Callable[[PipelineState], dict]:
    config = INTENT_REGISTRY.get(domain)
    _lazy_agent = [None]  # mutable container for lazy singleton
    _initialized = [False]

    def _get_agent():
        if not _initialized[0] and config is not None:
            _initialized[0] = True
            try:
                _lazy_agent[0] = config.agent_factory()
            except Exception:
                _lazy_agent[0] = None
        return _lazy_agent[0]

    def agent_node(state: PipelineState, *, config: RunnableConfig = None) -> dict:
        agent = _get_agent()
        if agent is None:
            return {
                "domain_agent_response": DomainAgentResponse(
                    domain=domain,
                    error=f"Agent {domain.value} not implemented",
                )
            }

        try:
            if domain == Domain.WORKSPACE_QA:
                return _run_workspace_qa(agent, state, config)

            if domain == Domain.DOCUMENT_UNDERSTANDING:
                answer, sources = agent.ask(
                    org_id=state["org_id"],
                    file_ids=_context_file_ids(state),
                    question=_latest_user_text(state),
                )
                return {
                    "domain_agent_response": DomainAgentResponse(
                        domain=domain,
                        text=answer,
                        sources=sources,
                    )
                }

            if domain in {Domain.TASK_CREATOR, Domain.MEETING_SCHEDULER}:
                from langgraph.types import interrupt
                from src.api.internal.v1.schemas import ChatMessage as _ChatMessage
                messages = _chat_messages(state)
                clarification = (
                    agent.needs_clarification(messages)
                    if hasattr(agent, "needs_clarification")
                    else None
                )
                if clarification:
                    user_answer = interrupt(clarification)
                    messages = messages + [_ChatMessage(role="user", content=str(user_answer))]
                proposal = agent.propose(messages)
                return {
                    "domain_agent_response": DomainAgentResponse(
                        domain=domain,
                        proposed_actions=[proposal] if proposal is not None else [],
                    )
                }

            return {
                "domain_agent_response": DomainAgentResponse(
                    domain=domain,
                    error=f"No node adapter for {domain.value}",
                )
            }
        except Exception as error:
            return {
                "domain_agent_response": DomainAgentResponse(
                    domain=domain,
                    error=str(error),
                )
            }

    agent_node.__name__ = f"{domain.value}_node"
    return agent_node


def _run_workspace_qa(agent, state: PipelineState, run_config: RunnableConfig | None) -> dict:
    thread_id = (run_config or {}).get("configurable", {}).get("thread_id")
    context = {
        "org_id": state["org_id"],
        "user_id": state["user_id"],
        "auth_token": state.get("auth_token") or "",
    }
    result = agent.invoke(
        {"messages": state["messages"]},
        config={
            "recursion_limit": 15,
            "configurable": {"thread_id": thread_id} if thread_id else {},
        },
        context=context,
    )
    last_message = result["messages"][-1] if result.get("messages") else None
    content = (
        getattr(last_message, "content", str(last_message)) if last_message else str(result)
    )
    return {
        "domain_agent_response": DomainAgentResponse(
            domain=Domain.WORKSPACE_QA,
            text=content,
        )
    }


def create_all_agent_nodes() -> dict[Domain, Callable[[PipelineState], dict]]:
    return {domain: create_agent_node(domain) for domain in INTENT_REGISTRY}


def get_agent_node_name(domain: Domain) -> str:
    return domain.value


def _latest_user_text(state: PipelineState) -> str:
    for message in reversed(state["messages"]):
        if getattr(message, "type", None) == "human":
            return str(message.content)
    return ""


def _context_file_ids(state: PipelineState) -> list[str]:
    context = state.get("context", {})
    file_ids = context.get("fileIds") or context.get("file_ids") or []
    return list(file_ids) if isinstance(file_ids, list) else []


def _chat_messages(state: PipelineState):
    from src.api.internal.v1.schemas import ChatMessage

    messages = []
    for message in state["messages"]:
        role: Literal["user", "assistant"] = (
            "user" if getattr(message, "type", None) == "human" else "assistant"
        )
        messages.append(ChatMessage(role=role, content=str(message.content)))
    return messages
