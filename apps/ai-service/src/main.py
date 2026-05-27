from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from src.ai.v1.memory.postgres import create_checkpointer, create_store
from src.api.routes import router as public_router
from src.api.internal.v1.router import router as internal_v1_router
from src.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.checkpointer = create_checkpointer()
    app.state.store = create_store()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Serenity AI service with FastAPI, LangGraph, Langfuse, and Postgres memory hooks",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public_router, prefix="/api")
app.include_router(internal_v1_router, prefix="/api/internal/v1", tags=["internal"])


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "version": settings.VERSION}
