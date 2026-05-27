"""Langfuse integration helpers.

The service must be runnable in local development without tracing credentials, so all
helpers return no-op values when Langfuse is not configured.
"""

from contextlib import contextmanager
from typing import Any, Iterator
from uuid import uuid4

from src.core.config import settings


def langfuse_enabled() -> bool:
    return bool(settings.LANGFUSE_PUBLIC_KEY and settings.LANGFUSE_SECRET_KEY)


def langfuse_callback_handler() -> Any | None:
    if not langfuse_enabled():
        return None
    try:
        from langfuse.langchain import CallbackHandler

        return CallbackHandler()
    except Exception:
        return None


def callbacks() -> list[Any]:
    handler = langfuse_callback_handler()
    return [handler] if handler is not None else []


def new_trace_id() -> str | None:
    if not langfuse_enabled():
        return None
    return str(uuid4())


@contextmanager
def span(_name: str, metadata: dict[str, Any] | None = None) -> Iterator[None]:
    # Langfuse v4 exposes multiple clients depending on setup. Keep manual tracing
    # isolated so endpoint behavior is unaffected by tracing library changes.
    _ = metadata
    yield


def trace_metadata(
    *,
    org_id: str,
    user_id: str,
    session_id: str | None,
    thread_id: str | None,
    entrypoint: str | None,
    agent: str | None = None,
    file_ids: list[str] | None = None,
    conversation_id: str | None = None,
    wiki_page_id: str | None = None,
    meeting_id: str | None = None,
) -> dict[str, Any]:
    return {
        "orgId": org_id,
        "userId": user_id,
        "sessionId": session_id,
        "threadId": thread_id,
        "entrypoint": entrypoint,
        "agent": agent,
        "fileIds": file_ids or [],
        "conversationId": conversation_id,
        "wikiPageId": wiki_page_id,
        "meetingId": meeting_id,
    }


def langchain_metadata(metadata: dict[str, Any]) -> dict[str, str]:
    """Return metadata safe for LangChain/OpenTelemetry propagation."""
    safe: dict[str, str] = {}
    for key, value in metadata.items():
        if value is None:
            continue
        if isinstance(value, list):
            safe[key] = ",".join(str(item) for item in value)
            continue
        safe[key] = str(value)
    return safe
