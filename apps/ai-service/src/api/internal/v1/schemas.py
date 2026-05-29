"""Public v1 API schemas."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",
    )


class ChatMessage(CamelModel):
    role: Literal["system", "user", "assistant", "tool"]
    content: str


class AuthContext(CamelModel):
    org_id: str
    user_id: str
    role: str | None = None
    display_name: str | None = None
    email: str | None = None
    org_name: str | None = None
    org_slug: str | None = None


class RequestContext(CamelModel):
    conversation_id: str | None = None
    meeting_id: str | None = None
    selected_text: str | None = None
    entrypoint: str | None = None
    time_zone: str | None = None


ProposedActionType = Literal[
    "CREATE_TASK",
    "CREATE_EVENT",
    "CREATE_MEETING",
    "BOOK_ROOM",
    "UPDATE_CALENDAR_ITEM",
    "CREATE_WIKI_PAGE",
]


class ProposedAction(CamelModel):
    type: ProposedActionType
    payload: dict[str, Any]
    confidence: float = 0.5
    requires_confirmation: bool = True


class ChatRequest(CamelModel):
    session_id: str
    messages: list[ChatMessage]
    auth_context: AuthContext
    context: RequestContext = Field(default_factory=RequestContext)


class ChatResponse(CamelModel):
    answer: str
    thread_id: str
    proposed_actions: list[ProposedAction] = Field(default_factory=list)
    trace_id: str | None = None


class ExecuteActionRequest(CamelModel):
    auth_context: AuthContext
    action: ProposedAction
    confirmation_id: str | None = None


class ExecuteActionResponse(CamelModel):
    status: Literal["not_implemented"] = "not_implemented"
    message: str
