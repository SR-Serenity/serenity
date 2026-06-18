"""Internal Serenity AI endpoints."""

import hashlib
import json

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse

from src.ai.v1.documents.index_store import IndexedChunk, get_index_store
from src.ai.v1.graph.runtime import run_chat, stream_chat
from src.ai.v1.agents.automation_agent.agent import automation_agent
from src.ai.v1.agents.automation_agent.store import save_execution
from src.ai.v1.agents.chat_assist.agent import create_chat_assist_agent
from src.ai.v1.agents.workflow_suggest_agent import workflow_suggest_agent
from src.ai.v1.agents.meeting_notes import meeting_notes_agent
from src.ai.v1.agents.meeting_live_transcription import (
    live_meeting_transcription_manager,
)
from src.ai.v1.agents.meeting_transcription import meeting_transcription_agent
from src.ai.v1.agents.task_extractor import task_extractor_agent
from src.api.internal.v1.schemas import (
    AutomationExecuteRequest,
    AutomationExecuteResponse,
    WorkflowSuggestRequest,
    WorkflowSuggestResponse,
    WorkflowSuggestStepsGraph,
    WorkflowSuggestStepNode,
    WorkflowSuggestStepEdge,
    ChatAssistRequest,
    ChatAssistResponse,
    ChatRequest,
    ChatResponse,
    ExecuteActionRequest,
    ExecuteActionResponse,
    FileAskRequest,
    FileAskResponse,
    FileIndexRequest,
    FileIndexResponse,
    FileSource,
    LiveMeetingStartRequest,
    LiveMeetingStatusResponse,
    LiveMeetingStopRequest,
    MeetingNotesRequest,
    MeetingNotesResponse,
    MeetingTranscriptSegment,
    MeetingTranscriptionRequest,
    MeetingTranscriptionResponse,
    ProposedTask,
    TaskExtractRequest,
    TaskExtractResponse,
    WikiDeleteRequest,
    WikiIndexRequest,
    WikiIndexResponse,
    WikiSearchRequest,
    WikiSearchResponse,
    WikiSearchResult,
)
from src.core.config import settings
from src.ai.v1.agents.meeting_live_transcription.agent import LiveMeetingStart

router = APIRouter(prefix="/ai")
chat_assist_agent = create_chat_assist_agent()


def _assert_internal_token(request: Request) -> None:
    if not settings.INTERNAL_API_TOKEN:
        return
    token = request.headers.get("x-internal-api-token")
    if token != settings.INTERNAL_API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API token",
        )


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    _assert_internal_token(request)
    auth_token = request.headers.get("authorization")
    return await run_chat(payload, auth_token=auth_token)


@router.post("/chat/stream")
async def chat_stream(payload: ChatRequest, request: Request) -> StreamingResponse:
    _assert_internal_token(request)
    auth_token = request.headers.get("authorization")

    async def generate():
        async for event in stream_chat(payload, auth_token=auth_token):
            yield json.dumps(jsonable_encoder(event), ensure_ascii=False) + "\n"

    return StreamingResponse(
        generate(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/assist", response_model=ChatAssistResponse)
async def chat_assist(payload: ChatAssistRequest, request: Request) -> ChatAssistResponse:
    _assert_internal_token(request)

    context = "\n".join(
        f"{message.role}: {message.content}"
        for message in payload.conversation_context
        if message.content
    )
    prompt = (
        f"Conversation context:\n{context or '(none)'}\n\n"
        f"User request:\n{payload.prompt}"
    )
    return ChatAssistResponse(suggested_content=chat_assist_agent.run(prompt))


@router.post("/tasks/extract", response_model=TaskExtractResponse)
async def extract_tasks(payload: TaskExtractRequest, request: Request) -> TaskExtractResponse:
    """Extract structured follow-up task proposals from a conversation."""
    _assert_internal_token(request)

    conversation_context = [
        {"role": msg.role, "content": msg.content}
        for msg in payload.conversation_context
    ]

    extracted = task_extractor_agent.extract(
        conversation_context=conversation_context,
        source_title=payload.source_title,
    )

    proposed = [
        ProposedTask(
            title=task.title,
            description=task.description,
            assignee_name=task.assignee_name,
            due_date=task.due_date,
            priority=task.priority.upper(),  # type: ignore[arg-type]
            reason=task.reason,
        )
        for task in extracted
    ]

    return TaskExtractResponse(proposed_tasks=proposed)


@router.post("/meetings/notes", response_model=MeetingNotesResponse)
async def summarize_meeting_notes(
    payload: MeetingNotesRequest,
    request: Request,
) -> MeetingNotesResponse:
    """Summarize a live meeting transcript into structured meeting notes."""
    _assert_internal_token(request)

    result = meeting_notes_agent.summarize(
        transcript_markdown=payload.transcript_markdown,
        existing_notes_markdown=payload.existing_notes_markdown,
    )

    return MeetingNotesResponse(
        summary=result.summary,
        markdown=meeting_notes_agent.to_markdown(result),
    )


@router.post("/meetings/transcribe", response_model=MeetingTranscriptionResponse)
async def transcribe_meeting_recording(
    payload: MeetingTranscriptionRequest,
    request: Request,
) -> MeetingTranscriptionResponse:
    """Transcribe a final meeting recording from a signed audio URL."""
    _assert_internal_token(request)

    try:
        result = await meeting_transcription_agent.transcribe_url(
            audio_url=payload.audio_url,
            model=payload.model,
            language=payload.language,
            prompt=payload.prompt,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Meeting transcription failed: {exc}",
        ) from exc

    return MeetingTranscriptionResponse(
        text=result.text,
        transcript_markdown=meeting_transcription_agent.to_markdown(result),
        segments=[
            MeetingTranscriptSegment(
                text=segment.text,
                speaker=segment.speaker,
                start=segment.start,
                end=segment.end,
            )
            for segment in result.segments
        ],
        model=result.model,
    )


@router.post("/meetings/live/start", response_model=LiveMeetingStatusResponse)
async def start_live_meeting_transcription(
    payload: LiveMeetingStartRequest,
    request: Request,
) -> LiveMeetingStatusResponse:
    """Start a LiveKit room worker that streams all speaker tracks to Realtime."""
    _assert_internal_token(request)

    try:
        result = await live_meeting_transcription_manager.start(
            LiveMeetingStart(
                org_id=payload.org_id,
                room_id=payload.room_id,
                room_name=payload.room_name,
                livekit_ws_url=payload.livekit_ws_url,
                livekit_token=payload.livekit_token,
                model=payload.model,
            ),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Live meeting transcription failed to start: {exc}",
        ) from exc

    return LiveMeetingStatusResponse(**result)


@router.post("/meetings/live/stop", response_model=LiveMeetingStatusResponse)
async def stop_live_meeting_transcription(
    payload: LiveMeetingStopRequest,
    request: Request,
) -> LiveMeetingStatusResponse:
    """Stop a LiveKit room transcription worker."""
    _assert_internal_token(request)
    result = await live_meeting_transcription_manager.stop(payload.room_id)
    return LiveMeetingStatusResponse(**result)


@router.post("/automation/execute", response_model=AutomationExecuteResponse)
async def automation_execute(
    payload: AutomationExecuteRequest,
    request: Request,
) -> AutomationExecuteResponse:
    """Execute an automation rule: generate message content and log the run."""
    _assert_internal_token(request)

    content = automation_agent.execute(
        instruction=payload.instruction,
        org_name=payload.context.org_name,
        trigger_type=payload.context.trigger_type,
        display_name=payload.context.display_name,
        message_content=payload.context.message_content,
        task_title=payload.context.task_title,
        task_status=payload.context.task_status,
        use_web_search=payload.use_web_search,
    )

    execution_id = save_execution(
        org_id=payload.org_id,
        instruction=payload.instruction,
        context=payload.context.model_dump(),
        content=content,
    )

    return AutomationExecuteResponse(content=content, execution_id=execution_id)


@router.post("/automation/suggest", response_model=WorkflowSuggestResponse)
async def automation_suggest(
    payload: WorkflowSuggestRequest,
    request: Request,
) -> WorkflowSuggestResponse:
    """Generate a workflow stepsGraph from a plain-English description."""
    _assert_internal_token(request)

    graph = workflow_suggest_agent.suggest(description=payload.description)
    if not graph:
        return WorkflowSuggestResponse(
            name="",
            stepsGraph=WorkflowSuggestStepsGraph(nodes=[], edges=[]),
        )

    steps_graph = WorkflowSuggestStepsGraph(
        nodes=[
            WorkflowSuggestStepNode(
                id=n.id,
                type=n.type,
                nodeType=n.node_type,
                config=n.config,
                position=n.position,
            )
            for n in graph.nodes
        ],
        edges=[
            WorkflowSuggestStepEdge(id=e.id, source=e.source, target=e.target)
            for e in graph.edges
        ],
    )

    return WorkflowSuggestResponse(name=graph.name, stepsGraph=steps_graph)


@router.post("/actions/execute", response_model=ExecuteActionResponse)
async def execute_action(
    payload: ExecuteActionRequest,
    request: Request,
) -> ExecuteActionResponse:
    _assert_internal_token(request)
    _ = payload
    return ExecuteActionResponse(
        message="Confirmed AI action execution is reserved for a later implementation.",
    )


@router.post("/files/index", response_model=FileIndexResponse)
async def index_file(payload: FileIndexRequest, request: Request) -> FileIndexResponse:
    _assert_internal_token(request)
    store = get_index_store()
    chunks = []
    for idx, page in enumerate(payload.pages, start=1):
        content = (page or "").strip()
        if not content:
            continue
        chunks.append(
            IndexedChunk(
                source_id=payload.file.file_id,
                chunk_id=f"page-{idx}",
                title=payload.file.title,
                heading_path=None,
                content=content,
                content_hash=_hash_text(content),
                metadata={"page": idx},
            )
        )
    count = store.index_chunks(
        org_id=payload.auth_context.org_id,
        source_type="file",
        source_id=payload.file.file_id,
        chunks=chunks,
    )
    return FileIndexResponse(chunks_indexed=count)


@router.post("/files/ask", response_model=FileAskResponse)
async def ask_files(payload: FileAskRequest, request: Request) -> FileAskResponse:
    _assert_internal_token(request)
    store = get_index_store()
    results = store.search(
        org_id=payload.auth_context.org_id,
        source_type="file",
        query=payload.question,
        source_ids=payload.file_ids,
        limit=5,
    )
    sources = [
        FileSource(
            file_id=result.source_id,
            page=int((result.metadata or {}).get("page", 0) or 0),
            snippet=_truncate_snippet(result.content),
            score=result.score,
        )
        for result in results
    ]
    answer = (
        "I found relevant content in your indexed files."
        if sources
        else "I could not find relevant content in the indexed files."
    )
    return FileAskResponse(answer=answer, sources=sources)


@router.post("/wiki/index", response_model=WikiIndexResponse)
async def index_wiki(payload: WikiIndexRequest, request: Request) -> WikiIndexResponse:
    _assert_internal_token(request)
    store = get_index_store()
    chunks = _chunk_wiki_page(payload.title, payload.content_markdown, payload.content_json)
    count = store.index_chunks(
        org_id=payload.org_id,
        source_type="wiki",
        source_id=payload.page_id,
        chunks=chunks,
    )
    return WikiIndexResponse(chunks_indexed=count)


@router.post("/wiki/delete")
async def delete_wiki(payload: WikiDeleteRequest, request: Request) -> dict:
    _assert_internal_token(request)
    store = get_index_store()
    store.delete_source(org_id=payload.org_id, source_type="wiki", source_id=payload.page_id)
    return {"success": True}


@router.post("/wiki/search", response_model=WikiSearchResponse)
async def search_wiki(payload: WikiSearchRequest, request: Request) -> WikiSearchResponse:
    _assert_internal_token(request)
    store = get_index_store()
    results = store.search(
        org_id=payload.org_id,
        source_type="wiki",
        query=payload.query,
        limit=max(1, min(payload.limit, 10)),
    )
    return WikiSearchResponse(
        results=[
            WikiSearchResult(
                page_id=result.source_id,
                chunk_id=result.chunk_id,
                title=result.title,
                heading_path=result.heading_path,
                snippet=_truncate_snippet(result.content),
                score=result.score,
            )
            for result in results
        ]
    )


def _chunk_wiki_page(
    title: str,
    content_markdown: str | None,
    content_json: list[dict] | None,
) -> list[IndexedChunk]:
    raw_content = (content_markdown or "").strip()
    if not raw_content and content_json:
        raw_content = json.dumps(content_json, ensure_ascii=True)

    if not raw_content:
        return []

    chunks: list[IndexedChunk] = []
    heading_stack: list[str] = []
    buffer: list[str] = []

    def flush() -> None:
        if not buffer:
            return
        body = "\n".join(buffer).strip()
        if not body:
            buffer.clear()
            return
        heading_path = heading_stack.copy() or None
        chunk_text = "\n".join([title, *(heading_path or []), body]).strip()
        chunks.append(
            IndexedChunk(
                source_id="",
                chunk_id=f"chunk-{len(chunks) + 1}",
                title=title,
                heading_path=heading_path,
                content=chunk_text,
                content_hash=_hash_text(chunk_text),
            )
        )
        buffer.clear()

    for line in raw_content.splitlines():
        if line.startswith("#"):
            flush()
            level = len(line) - len(line.lstrip("#"))
            heading = line.lstrip("#").strip()
            if not heading:
                continue
            heading_stack = heading_stack[: max(level - 1, 0)]
            heading_stack.append(heading)
        else:
            buffer.append(line)

    flush()

    for idx, chunk in enumerate(chunks, start=1):
        chunk.source_id = ""
        chunk.chunk_id = f"chunk-{idx}"
        chunk.metadata = {"headingPath": chunk.heading_path or []}
    return chunks


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _truncate_snippet(text: str, limit: int = 200) -> str:
    trimmed = text.strip().replace("\n", " ")
    return trimmed if len(trimmed) <= limit else f"{trimmed[:limit]}…"
