"""Internal Serenity AI endpoints."""

from fastapi import APIRouter, HTTPException, Request, status

from src.ai.v1.graph.runtime import run_chat
from src.api.internal.v1.schemas import (
    ChatRequest,
    ChatResponse,
    ExecuteActionRequest,
    ExecuteActionResponse,
)
from src.core.config import settings

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
