"""Non-internal API routes."""

from fastapi import APIRouter

from src.ai.v1.graph.runtime import run_chat
from src.api.internal.v1.schemas import ChatRequest

router = APIRouter()


@router.get("/")
async def root() -> dict[str, str]:
    return {"message": "Serenity AI Service API"}


@router.post("/ai/chat")
async def public_chat(payload: ChatRequest):
    return await run_chat(payload)
