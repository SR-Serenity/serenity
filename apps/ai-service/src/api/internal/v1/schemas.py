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
    wiki_page_id: str | None = None
    task_id: str | None = None
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
    "EDIT_WIKI_PAGE",
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


class FileIndexFile(CamelModel):
    file_id: str
    title: str


class FileIndexRequest(CamelModel):
    auth_context: AuthContext
    file: FileIndexFile
    pages: list[str]


class FileIndexResponse(CamelModel):
    chunks_indexed: int


class FileAskRequest(CamelModel):
    auth_context: AuthContext
    file_ids: list[str]
    question: str


class FileSource(CamelModel):
    file_id: str
    page: int
    snippet: str
    score: float


class FileAskResponse(CamelModel):
    answer: str
    sources: list[FileSource]


class WikiIndexRequest(CamelModel):
    org_id: str
    page_id: str
    title: str
    content_markdown: str | None = None
    content_json: list[dict] | None = None
    metadata: dict | None = None


class WikiIndexResponse(CamelModel):
    chunks_indexed: int


class WikiDeleteRequest(CamelModel):
    org_id: str
    page_id: str


class WikiSearchRequest(CamelModel):
    org_id: str
    query: str
    limit: int = 5


class WikiSearchResult(CamelModel):
    page_id: str
    chunk_id: str
    title: str | None = None
    heading_path: list[str] | None = None
    snippet: str
    score: float


class WikiSearchResponse(CamelModel):
    results: list[WikiSearchResult]


# ── Task Extraction ───────────────────────────────────────────────────────────

class ConversationMessage(CamelModel):
    role: str
    content: str


class TaskExtractRequest(CamelModel):
    """Request for the /ai/tasks/extract endpoint."""
    auth_context: AuthContext
    conversation_context: list[ConversationMessage]
    source_title: str | None = None


class ProposedTask(CamelModel):
    title: str
    description: str | None = None
    assignee_name: str | None = None
    due_date: str | None = None
    priority: Literal["LOW", "MEDIUM", "HIGH"] = "MEDIUM"
    reason: str


class TaskExtractResponse(CamelModel):
    """Response from the /ai/tasks/extract endpoint."""
    proposed_tasks: list[ProposedTask] = Field(default_factory=list)


# ── Automation Execute ────────────────────────────────────────────────────────

class AutomationContext(CamelModel):
    trigger_type: str | None = None
    user_id: str | None = None
    display_name: str | None = None
    org_name: str | None = None
    message_content: str | None = None


class AutomationExecuteRequest(CamelModel):
    org_id: str
    instruction: str
    context: AutomationContext = Field(default_factory=AutomationContext)


class AutomationExecuteResponse(CamelModel):
    content: str
    execution_id: str
