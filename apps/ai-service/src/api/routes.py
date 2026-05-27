"""Non-internal API routes."""

from fastapi import APIRouter

from src.ai.v1.agents.document_understanding import document_agent
from src.ai.v1.graph.runtime import run_chat
from src.api.internal.v1.schemas import ChatRequest, FileAskRequest, FileIndexRequest
from src.integrations.langfuse import new_trace_id

router = APIRouter()


@router.get("/")
async def root() -> dict[str, str]:
    return {"message": "Serenity AI Service API"}


@router.post("/ai/chat")
async def public_chat(payload: ChatRequest):
    return await run_chat(payload)


@router.post("/ai/files/index")
async def public_index_file(payload: FileIndexRequest):
    chunks = document_agent.index_file(
        org_id=payload.auth_context.org_id,
        file=payload.file,
        text=payload.text,
        pages=payload.pages,
    )
    return {
        "fileId": payload.file.file_id,
        "chunksIndexed": chunks,
        "traceId": new_trace_id(),
    }


@router.post("/ai/files/ask")
async def public_ask_file(payload: FileAskRequest):
    answer, sources = document_agent.ask(
        org_id=payload.auth_context.org_id,
        file_ids=payload.file_ids,
        question=payload.question,
    )
    return {"answer": answer, "sources": sources, "traceId": new_trace_id()}
