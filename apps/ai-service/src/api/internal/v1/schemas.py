"""Public v1 API schemas."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
    "DRAFT_CHAT_MESSAGE",
    "DRAFT_EMAIL",
]


class ProposedAction(CamelModel):
    type: ProposedActionType
    payload: dict[str, Any]
    confidence: float = 0.5
    requires_confirmation: bool = True


class ChatRequest(CamelModel):
    session_id: str
    message: str
    auth_context: AuthContext
    context: RequestContext = Field(default_factory=RequestContext)

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_messages(cls, data: Any) -> Any:
        if not isinstance(data, dict) or data.get("message"):
            return data

        messages = data.get("messages")
        if not isinstance(messages, list):
            return data

        content_lines: list[str] = []
        for item in messages:
            if not isinstance(item, dict):
                continue
            content = str(item.get("content") or "").strip()
            if not content:
                continue
            role = str(item.get("role") or "user")
            content_lines.append(f"{role}: {content}")

        if content_lines:
            return {**data, "message": "\n".join(content_lines)}
        return data


class ChatResponse(CamelModel):
    answer: str
    thread_id: str
    proposed_actions: list[ProposedAction] = Field(default_factory=list)
    trace_id: str | None = None


class ChatAssistRequest(CamelModel):
    auth_context: AuthContext
    conversation_context: list[ChatMessage] = Field(default_factory=list)
    prompt: str


class ChatAssistResponse(CamelModel):
    suggested_content: str


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

class TaskConversationMessage(CamelModel):
    role: str
    content: str


class TaskExtractRequest(CamelModel):
    """Request for the /ai/tasks/extract endpoint."""
    auth_context: AuthContext
    conversation_context: list[TaskConversationMessage]
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


# ── Meeting Notes ─────────────────────────────────────────────────────────────

class MeetingNotesRequest(CamelModel):
    auth_context: AuthContext
    room_id: str
    transcript_markdown: str
    existing_notes_markdown: str | None = None


class MeetingNotesResponse(CamelModel):
    summary: list[str] = Field(default_factory=list)
    markdown: str


class MeetingTranscriptionRequest(CamelModel):
    auth_context: AuthContext
    room_id: str
    audio_url: str
    model: str | None = None
    language: str | None = None
    prompt: str | None = None


class MeetingTranscriptSegment(CamelModel):
    text: str
    speaker: str | None = None
    start: float | None = None
    end: float | None = None


class MeetingTranscriptionResponse(CamelModel):
    text: str
    transcript_markdown: str
    segments: list[MeetingTranscriptSegment] = Field(default_factory=list)
    model: str


class LiveMeetingStartRequest(CamelModel):
    org_id: str
    room_id: str
    room_name: str
    livekit_ws_url: str
    livekit_token: str
    model: str | None = None


class LiveMeetingStopRequest(CamelModel):
    room_id: str


class LiveMeetingStatusResponse(CamelModel):
    room_id: str
    status: str
    model: str | None = None


# ── Workflow Suggest ──────────────────────────────────────────────────────────

class WorkflowSuggestRequest(BaseModel):
    description: str
    org_id: str


class WorkflowSuggestStepNode(BaseModel):
    id: str
    type: Literal["trigger", "action"]
    node_type: str = Field(alias="nodeType")
    config: dict = Field(default_factory=dict)
    position: dict = Field(default_factory=lambda: {"x": 250, "y": 80})

    model_config = ConfigDict(populate_by_name=True)


class WorkflowSuggestStepEdge(BaseModel):
    id: str
    source: str
    target: str


class WorkflowSuggestStepsGraph(BaseModel):
    nodes: list[WorkflowSuggestStepNode]
    edges: list[WorkflowSuggestStepEdge]


class WorkflowSuggestResponse(BaseModel):
    name: str
    steps_graph: WorkflowSuggestStepsGraph = Field(alias="stepsGraph")

    model_config = ConfigDict(populate_by_name=True)


# ── Automation Execute ────────────────────────────────────────────────────────

class AutomationContext(CamelModel):
    trigger_type: str | None = None
    user_id: str | None = None
    display_name: str | None = None
    org_name: str | None = None
    message_content: str | None = None
    task_title: str | None = None
    task_status: str | None = None


class AutomationExecuteRequest(CamelModel):
    org_id: str
    instruction: str
    context: AutomationContext = Field(default_factory=AutomationContext)
    use_web_search: bool = False


class AutomationExecuteResponse(CamelModel):
    content: str
    execution_id: str
