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

            if domain == Domain.SCHEDULE_AGENT:
                from langgraph.types import interrupt
                from src.api.internal.v1.schemas import ChatMessage as _ChatMessage
                messages = _chat_messages(state)
                context = {
                    **state.get("context", {}),
                    "auth_token": state.get("auth_token") or "",
                }
                clarification = (
                    agent.needs_clarification(messages, context=context)
                    if hasattr(agent, "needs_clarification")
                    else None
                )
                if clarification:
                    user_answer = interrupt(clarification)
                    messages = messages + [_ChatMessage(role="user", content=str(user_answer))]
                proposal = agent.propose(messages, context=context)
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
    from langchain_core.messages import SystemMessage
    from src.ai.v1.agents.workspace_qa.prompts import build_system_prompt

    thread_id = (run_config or {}).get("configurable", {}).get("thread_id")
    agent_context = {
        "org_id": state["org_id"],
        "user_id": state["user_id"],
        "auth_token": state.get("auth_token") or "",
        "user_context": state.get("context", {}).get("userContext", {}),
        "timeZone": state.get("context", {}).get("timeZone", ""),
    }
    system_message = SystemMessage(content=build_system_prompt(agent_context))
    messages = [system_message] + list(state["messages"])
    result = agent.invoke(
        {"messages": messages},
        config={
            "recursion_limit": 15,
            "configurable": {
                **({"thread_id": thread_id} if thread_id else {}),
                "agent_context": agent_context,
            },
        },
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


def _chat_messages(state: PipelineState):
    from src.api.internal.v1.schemas import ChatMessage

    messages = []
    for message in state["messages"]:
        message_type = getattr(message, "type", None)
        role: Literal["system", "user", "assistant"] = (
            "user" if message_type == "human" else "system" if message_type == "system" else "assistant"
        )
        messages.append(ChatMessage(role=role, content=str(message.content)))
    return messages
