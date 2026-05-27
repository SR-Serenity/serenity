"""Internal Serenity AI endpoints."""

from fastapi import APIRouter, HTTPException, Request, status

from src.ai.v1.agents.document_understanding import document_agent
from src.ai.v1.graph.runtime import run_chat
from src.api.internal.v1.schemas import (
    ChatRequest,
    ChatResponse,
    ExecuteActionRequest,
    ExecuteActionResponse,
    FileAskRequest,
    FileAskResponse,
    FileIndexRequest,
    FileIndexResponse,
)
from src.core.config import settings
from src.integrations.langfuse import new_trace_id, span, trace_metadata

router = APIRouter(prefix="/ai")


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


@router.post("/files/index", response_model=FileIndexResponse)
async def index_file(payload: FileIndexRequest, request: Request) -> FileIndexResponse:
    _assert_internal_token(request)
    trace_id = new_trace_id()
    metadata = trace_metadata(
        org_id=payload.auth_context.org_id,
        user_id=payload.auth_context.user_id,
        session_id=None,
        thread_id=None,
        entrypoint="files.index",
        agent="DocumentUnderstandingAgent",
        file_ids=[payload.file.file_id],
    )
    with span("file.index", metadata):
        chunks = document_agent.index_file(
            org_id=payload.auth_context.org_id,
            file=payload.file,
            text=payload.text,
            pages=payload.pages,
        )
    return FileIndexResponse(file_id=payload.file.file_id, chunks_indexed=chunks, trace_id=trace_id)


@router.post("/files/ask", response_model=FileAskResponse)
async def ask_file(payload: FileAskRequest, request: Request) -> FileAskResponse:
    _assert_internal_token(request)
    trace_id = new_trace_id()
    metadata = trace_metadata(
        org_id=payload.auth_context.org_id,
        user_id=payload.auth_context.user_id,
        session_id=payload.session_id,
        thread_id=None,
        entrypoint="files.ask",
        agent="DocumentUnderstandingAgent",
        file_ids=payload.file_ids,
    )
    with span("file.ask", metadata):
        answer, sources = document_agent.ask(
            org_id=payload.auth_context.org_id,
            file_ids=payload.file_ids,
            question=payload.question,
        )
    return FileAskResponse(answer=answer, sources=sources, trace_id=trace_id)


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
