"""LangGraph persistence setup with Postgres-first behavior and local fallbacks."""

from typing import Any

from src.core.config import settings, use_external_persistence


async def create_checkpointer() -> Any:
    if use_external_persistence() and settings.DATABASE_URL:
        try:
            import psycopg
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
            from psycopg.rows import dict_row

            conn = await psycopg.AsyncConnection.connect(
                settings.DATABASE_URL, autocommit=True, row_factory=dict_row
            )
            saver = AsyncPostgresSaver(conn)
            await saver.setup()
            return saver
        except Exception:
            pass

    try:
        from langgraph.checkpoint.memory import MemorySaver

        return MemorySaver()
    except Exception:
        return None


async def create_store() -> Any:
    if use_external_persistence() and settings.DATABASE_URL:
        try:
            import psycopg
            from langgraph.store.postgres.aio import AsyncPostgresStore
            from psycopg.rows import dict_row

            conn = await psycopg.AsyncConnection.connect(
                settings.DATABASE_URL, autocommit=True, row_factory=dict_row
            )
            store = AsyncPostgresStore(conn)
            await store.setup()
            return store
        except Exception:
            pass

    try:
        from langgraph.store.memory import InMemoryStore

        return InMemoryStore()
    except Exception:
        return None
