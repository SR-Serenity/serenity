from collections.abc import Callable
from typing import Literal

from langchain_core.runnables import RunnableConfig

from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import DomainAgentResponse, PipelineState
from src.ai.v1.orchestrators.intent_registry import INTENT_REGISTRY

_REACT_DOMAINS = {
    Domain.WIKI_AGENT,
    Domain.CHAT_AGENT,
    Domain.CALENDAR_AGENT,
    Domain.CONTACTS_AGENT,
    Domain.MAIL_AGENT,
}


def create_agent_node(domain: Domain) -> Callable[[PipelineState], dict]:
    config = INTENT_REGISTRY.get(domain)
    _lazy_agent = [None]
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
            return {"domain_agent_response": DomainAgentResponse(domain=domain, error=f"Agent {domain.value} not initialized")}

        try:
            if domain in _REACT_DOMAINS:
                return _run_react_agent(domain, agent, state, config)

            if domain == Domain.CHAT_ASSIST:
                result = agent.run(_latest_user_text(state))
                return {"domain_agent_response": DomainAgentResponse(domain=domain, text=result)}

            if domain == Domain.SCHEDULE_AGENT:
                from langgraph.types import interrupt
                from src.api.internal.v1.schemas import ChatMessage as _ChatMessage
                messages = _chat_messages(state)
                context = {**state.get("context", {}), "auth_token": state.get("auth_token") or ""}
                clarification = agent.needs_clarification(messages, context=context) if hasattr(agent, "needs_clarification") else None
                if clarification:
                    messages = messages + [_ChatMessage(role="user", content=str(interrupt(clarification)))]
                proposal = agent.propose(messages, context=context)
                return {"domain_agent_response": DomainAgentResponse(domain=domain, proposed_actions=[proposal] if proposal else [])}

            return {"domain_agent_response": DomainAgentResponse(domain=domain, error=f"No adapter for {domain.value}")}

        except Exception as error:
            return {"domain_agent_response": DomainAgentResponse(domain=domain, error=str(error))}

    agent_node.__name__ = f"{domain.value}_node"
    return agent_node


def _run_react_agent(domain: Domain, agent, state: PipelineState, run_config: RunnableConfig | None) -> dict:
    from langchain_core.messages import SystemMessage

    thread_id = (run_config or {}).get("configurable", {}).get("thread_id")
    raw_context = state.get("context", {})
    auth_token = state.get("auth_token") or ""
    task_id = raw_context.get("taskId")
    active_task: dict | None = None
    if task_id and auth_token:
        from src.services.workspace_service import get_workspace_task
        active_task = get_workspace_task(auth_token, task_id)

    agent_context = {
        "org_id": state["org_id"],
        "user_id": state["user_id"],
        "auth_token": auth_token,
        "user_context": raw_context.get("userContext", {}),
        "timeZone": raw_context.get("timeZone", ""),
        "wiki_page_id": raw_context.get("wikiPageId"),
        "conversation_id": raw_context.get("conversationId"),
        "task_id": task_id,
        "active_task": active_task,
    }

    system_prompt = _get_system_prompt(domain, agent_context)
    messages = [SystemMessage(content=system_prompt)] + list(state["messages"])

    result = agent.invoke(
        {"messages": messages},
        config={
            "configurable": {
                **({"thread_id": thread_id} if thread_id else {}),
                "agent_context": agent_context,
            },
        },
    )

    # create_agent returns {"messages": [...]}; last message is the AI reply
    content = _extract_agent_content(result)

    # wiki_agent stores pending edit in agent_context via edit_wiki_page_tool
    if domain == Domain.WIKI_AGENT:
        pending = agent_context.get("_pending_edit")
        if pending:
            from src.api.internal.v1.schemas import ProposedAction
            action = ProposedAction(
                type="EDIT_WIKI_PAGE",
                payload=pending,
                confidence=0.95,
                requires_confirmation=True,
            )
            return {"domain_agent_response": DomainAgentResponse(
                domain=domain,
                proposed_actions=[action],
                text=content,
            )}

    return {"domain_agent_response": DomainAgentResponse(domain=domain, text=content)}


def _get_system_prompt(domain: Domain, context: dict) -> str:
    if domain == Domain.WIKI_AGENT:
        from src.ai.v1.agents.wiki_agent.prompts import build_wiki_prompt
        return build_wiki_prompt(context)
    if domain == Domain.CHAT_AGENT:
        from src.ai.v1.agents.chat_agent.prompts import build_chat_prompt
        return build_chat_prompt(context)
    if domain == Domain.CALENDAR_AGENT:
        from src.ai.v1.agents.calendar_agent.prompts import build_calendar_prompt
        return build_calendar_prompt(context)
    if domain == Domain.CONTACTS_AGENT:
        from src.ai.v1.agents.contacts_agent.prompts import build_contacts_prompt
        return build_contacts_prompt(context)
    if domain == Domain.MAIL_AGENT:
        from src.ai.v1.agents.mail_agent.prompts import build_mail_prompt
        return build_mail_prompt(context)
    return ""


def create_all_agent_nodes() -> dict[Domain, Callable[[PipelineState], dict]]:
    return {domain: create_agent_node(domain) for domain in INTENT_REGISTRY}


def get_agent_node_name(domain: Domain) -> str:
    return domain.value


def _extract_agent_content(result) -> str:
    if isinstance(result, dict):
        msgs = result.get("messages", [])
        if msgs:
            last = msgs[-1]
            return str(getattr(last, "content", last))
        return str(result)
    return str(getattr(result, "content", result))


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
