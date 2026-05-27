"""LangGraph persistence setup with Postgres-first behavior and local fallbacks."""

from typing import Any

from src.core.config import settings


def create_checkpointer() -> Any:
    if settings.DATABASE_URL:
        try:
            from langgraph.checkpoint.postgres import PostgresSaver

            saver = PostgresSaver.from_conn_string(settings.DATABASE_URL)
            if hasattr(saver, "setup"):
                saver.setup()
            return saver
        except Exception:
            pass

    try:
        from langgraph.checkpoint.memory import MemorySaver

        return MemorySaver()
    except Exception:
        return None


def create_store() -> Any:
    if settings.DATABASE_URL:
        try:
            from langgraph.store.postgres import PostgresStore

            store = PostgresStore.from_conn_string(settings.DATABASE_URL)
            if hasattr(store, "setup"):
                store.setup()
            return store
        except Exception:
            pass

    try:
        from langgraph.store.memory import InMemoryStore

        return InMemoryStore()
    except Exception:
        return None
