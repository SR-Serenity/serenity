from typing import Annotated, Any, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field
from typing_extensions import NotRequired, Required

from src.ai.v1.contexts.schemas.enums import Domain
from src.api.internal.v1.schemas import ProposedAction


class InputGuardrail(BaseModel):
    is_safe: bool = True
    reasons: list[str] = Field(default_factory=list)


class OutputGuardrail(BaseModel):
    is_safe: bool = True
    reasons: list[str] = Field(default_factory=list)


class IntentDomain(BaseModel):
    domain: Domain
    confidence: float = Field(ge=0.0, le=1.0)


class IntentClassification(BaseModel):
    intent: list[IntentDomain] | None = None
    language: str = "English"


class DomainAgentResponse(BaseModel):
    domain: Domain
    text: str | None = None
    proposed_actions: list[ProposedAction] = Field(default_factory=list)
    error: str | None = None


def _merge_domain_responses(
    existing: list[DomainAgentResponse] | None,
    new: list[DomainAgentResponse] | DomainAgentResponse | None,
) -> list[DomainAgentResponse]:
    if new is None:
        return list(existing or [])
    if isinstance(new, list):
        if not new:
            return []
        return list(existing or []) + new
    return list(existing or []) + [new]


def _merge_actions(
    existing: list[ProposedAction] | None,
    new: list[ProposedAction] | None,
) -> list[ProposedAction]:
    if new is None:
        return list(existing or [])
    if not new:
        return []
    return list(existing or []) + new


class PipelineState(TypedDict):
    org_id: Required[str]
    user_id: Required[str]
    session_id: Required[str]
    role: NotRequired[str | None]
    thread_id: Required[str]
    auth_token: NotRequired[str | None]
    context: Required[dict[str, Any]]

    messages: Required[Annotated[list[AnyMessage], add_messages]]

    input_guardrail: NotRequired[InputGuardrail]
    output_guardrail: NotRequired[OutputGuardrail]
    detected_language: NotRequired[str]
    detected_intent: NotRequired[IntentClassification]

    memories: NotRequired[list[str]]
    answer: NotRequired[str]

    proposed_actions: NotRequired[Annotated[list[ProposedAction], _merge_actions]]
    domain_agent_response: NotRequired[
        Annotated[list[DomainAgentResponse], _merge_domain_responses]
    ]
