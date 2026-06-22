from typing import Literal

from langchain.agents import create_agent
from langchain.agents.middleware import ModelRequest, dynamic_prompt
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from src.ai.v1.agents.chat_agent.prompts import build_chat_prompt
from src.ai.v1.agents.chat_agent.tools import (
    get_conversation_messages_tool,
    get_messages_from_person_tool,
    list_conversations_tool,
    search_all_messages_tool,
    search_messages_tool,
)
from src.ai.v1.contexts.schemas.agent_context import AgentContext
from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import DomainAgentResponse, PipelineState
from src.api.internal.v1.schemas import ProposedAction
from src.core.config import openai_api_key_secret, settings


class ChatAgentOutput(BaseModel):
    intent: Literal["data", "draft_chat", "draft_email"]
    content: str
    draft_content: str | None = None
    email_to: str | None = None
    email_subject: str | None = None
    email_body: str | None = None


@dynamic_prompt
def _system_prompt(request: ModelRequest[AgentContext]) -> str:
    return build_chat_prompt(request.runtime.context)


_agent = create_agent(
    ChatOpenAI(model=settings.OPENAI_MODEL, api_key=openai_api_key_secret(), temperature=0),
    tools=[
        list_conversations_tool,
        get_conversation_messages_tool,
        search_messages_tool,
        search_all_messages_tool,
        get_messages_from_person_tool,
    ],
    middleware=[_system_prompt],
    response_format=ChatAgentOutput,
    context_schema=AgentContext,
    name="chat_agent",
)


async def chat_agent_node(state: PipelineState, **_) -> dict:
    raw = state.get("context", {})
    ctx = AgentContext(
        org_id=state["org_id"],
        user_id=state["user_id"],
        auth_token=state.get("auth_token") or "",
        user_context=raw.get("userContext", {}),
        time_zone=raw.get("timeZone", ""),
        conversation_id=raw.get("conversationId"),
    )
    try:
        result = await _agent.ainvoke(
            {"messages": list(state["messages"])},
            context=ctx,
        )
        output: ChatAgentOutput = result["structured_response"]

        if output.intent == "draft_chat" and output.draft_content:
            return {
                "domain_agent_response": DomainAgentResponse(
                    domain=Domain.CHAT_AGENT,
                    text=output.content,
                    proposed_actions=[
                        ProposedAction(
                            type="DRAFT_CHAT_MESSAGE",
                            payload={"content": output.draft_content},
                            confidence=0.95,
                            requires_confirmation=True,
                        )
                    ],
                )
            }

        if output.intent == "draft_email":
            return {
                "domain_agent_response": DomainAgentResponse(
                    domain=Domain.CHAT_AGENT,
                    text=output.content,
                    proposed_actions=[
                        ProposedAction(
                            type="DRAFT_EMAIL",
                            payload={
                                "to": output.email_to or "",
                                "subject": output.email_subject or "",
                                "body": output.email_body or "",
                            },
                            confidence=0.95,
                            requires_confirmation=True,
                        )
                    ],
                )
            }

        return {
            "domain_agent_response": DomainAgentResponse(
                domain=Domain.CHAT_AGENT,
                text=output.content,
            )
        }
    except Exception as error:
        return {
            "domain_agent_response": DomainAgentResponse(
                domain=Domain.CHAT_AGENT,
                error=str(error),
            )
        }
