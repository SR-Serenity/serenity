"""Persistence for automation execution logs."""

import json
import logging
import uuid

import psycopg

from src.core.config import settings

logger = logging.getLogger(__name__)

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS automation_executions (
    id          TEXT PRIMARY KEY,
    org_id      TEXT NOT NULL,
    instruction TEXT NOT NULL,
    context     JSONB NOT NULL DEFAULT '{}',
    content     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def ensure_table() -> None:
    if not settings.DATABASE_URL:
        return
    try:
        with psycopg.connect(settings.DATABASE_URL) as conn:
            conn.execute(_CREATE_TABLE)
            conn.commit()
    except Exception as exc:
        logger.warning("automation_store: could not ensure table: %s", exc)


def save_execution(
    *,
    org_id: str,
    instruction: str,
    context: dict,
    content: str | None,
) -> str:
    exec_id = str(uuid.uuid4())
    if not settings.DATABASE_URL:
        return exec_id
    try:
        with psycopg.connect(settings.DATABASE_URL) as conn:
            conn.execute(
                """
                INSERT INTO automation_executions (id, org_id, instruction, context, content)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (exec_id, org_id, instruction, json.dumps(context), content),
            )
            conn.commit()
    except Exception as exc:
        logger.warning("automation_store: could not save execution: %s", exc)
    return exec_id
