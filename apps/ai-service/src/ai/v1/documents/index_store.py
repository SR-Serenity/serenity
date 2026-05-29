"""Document indexing + search store with pgvector or in-memory fallback."""

from __future__ import annotations

import hashlib
import json
import random
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable

import psycopg

from src.core.config import settings


_VECTOR_DIM = 1536


@dataclass
class IndexedChunk:
    source_id: str
    chunk_id: str
    title: str | None
    heading_path: list[str] | None
    content: str
    content_hash: str
    metadata: dict | None = None


@dataclass
class SearchResult:
    source_id: str
    chunk_id: str
    title: str | None
    heading_path: list[str] | None
    content: str
    score: float
    metadata: dict | None = None


class DocumentIndexStore:
    def __init__(self) -> None:
        self._use_db = bool(settings.DATABASE_URL)
        self._db_ready = False
        self._memory: dict[tuple[str, str, str, str], IndexedChunk] = {}

    def index_chunks(
        self,
        *,
        org_id: str,
        source_type: str,
        source_id: str,
        chunks: Iterable[IndexedChunk],
    ) -> int:
        chunk_list = list(chunks)
        if not chunk_list:
            self.delete_source(org_id=org_id, source_type=source_type, source_id=source_id)
            return 0

        if not self._use_db:
            return self._index_memory(org_id, source_type, source_id, chunk_list)

        try:
            self._ensure_db()
            return self._index_db(org_id, source_type, source_id, chunk_list)
        except Exception:
            self._use_db = False
            return self._index_memory(org_id, source_type, source_id, chunk_list)

    def search(
        self,
        *,
        org_id: str,
        source_type: str,
        query: str,
        source_ids: list[str] | None = None,
        limit: int = 5,
    ) -> list[SearchResult]:
        if not self._use_db:
            return self._search_memory(org_id, source_type, query, source_ids, limit)

        try:
            self._ensure_db()
            return self._search_db(org_id, source_type, query, source_ids, limit)
        except Exception:
            self._use_db = False
            return self._search_memory(org_id, source_type, query, source_ids, limit)

    def delete_source(self, *, org_id: str, source_type: str, source_id: str) -> None:
        if not self._use_db:
            self._memory = {
                key: chunk
                for key, chunk in self._memory.items()
                if key[:3] != (org_id, source_type, source_id)
            }
            return

        try:
            self._ensure_db()
            with psycopg.connect(settings.DATABASE_URL, autocommit=True) as conn:
                conn.execute(
                    """
                    DELETE FROM ai_doc_chunks
                    WHERE org_id = %s AND source_type = %s AND source_id = %s
                    """,
                    (org_id, source_type, source_id),
                )
        except Exception:
            self._use_db = False
            self.delete_source(org_id=org_id, source_type=source_type, source_id=source_id)

    def _ensure_db(self) -> None:
        if self._db_ready or not settings.DATABASE_URL:
            return
        with psycopg.connect(settings.DATABASE_URL, autocommit=True) as conn:
            conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS ai_doc_chunks (
                    id TEXT PRIMARY KEY,
                    org_id TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    chunk_id TEXT NOT NULL,
                    title TEXT,
                    heading_path TEXT[],
                    content TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    embedding VECTOR(1536) NOT NULL,
                    metadata JSONB,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )
            conn.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS ai_doc_chunks_unique
                ON ai_doc_chunks (org_id, source_type, source_id, chunk_id);
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS ai_doc_chunks_source
                ON ai_doc_chunks (org_id, source_type, source_id);
                """
            )
        self._db_ready = True

    def _index_db(
        self,
        org_id: str,
        source_type: str,
        source_id: str,
        chunks: list[IndexedChunk],
    ) -> int:
        with psycopg.connect(settings.DATABASE_URL, autocommit=True) as conn:
            existing = {
                row[0]: row[1]
                for row in conn.execute(
                    """
                    SELECT chunk_id, content_hash
                    FROM ai_doc_chunks
                    WHERE org_id = %s AND source_type = %s AND source_id = %s
                    """,
                    (org_id, source_type, source_id),
                ).fetchall()
            }

            updated_chunks = [
                chunk for chunk in chunks if existing.get(chunk.chunk_id) != chunk.content_hash
            ]
            if updated_chunks:
                embeddings = self._embed_texts([chunk.content for chunk in updated_chunks])
                for chunk, embedding in zip(updated_chunks, embeddings, strict=False):
                    vector_literal = "[" + ",".join(f"{v:.6f}" for v in embedding) + "]"
                    conn.execute(
                        """
                        INSERT INTO ai_doc_chunks (
                            id,
                            org_id,
                            source_type,
                            source_id,
                            chunk_id,
                            title,
                            heading_path,
                            content,
                            content_hash,
                            embedding,
                            metadata,
                            updated_at
                        ) VALUES (
                            %(id)s,
                            %(org_id)s,
                            %(source_type)s,
                            %(source_id)s,
                            %(chunk_id)s,
                            %(title)s,
                            %(heading_path)s,
                            %(content)s,
                            %(content_hash)s,
                            %(embedding)s::vector,
                            %(metadata)s::jsonb,
                            %(updated_at)s
                        )
                        ON CONFLICT (org_id, source_type, source_id, chunk_id)
                        DO UPDATE SET
                            title = EXCLUDED.title,
                            heading_path = EXCLUDED.heading_path,
                            content = EXCLUDED.content,
                            content_hash = EXCLUDED.content_hash,
                            embedding = EXCLUDED.embedding,
                            metadata = EXCLUDED.metadata,
                            updated_at = EXCLUDED.updated_at
                        """,
                        {
                            "id": self._chunk_pk(org_id, source_type, source_id, chunk.chunk_id),
                            "org_id": org_id,
                            "source_type": source_type,
                            "source_id": source_id,
                            "chunk_id": chunk.chunk_id,
                            "title": chunk.title,
                            "heading_path": chunk.heading_path,
                            "content": chunk.content,
                            "content_hash": chunk.content_hash,
                            "embedding": vector_literal,
                            "metadata": json.dumps(chunk.metadata or {}),
                            "updated_at": datetime.utcnow(),
                        },
                    )

            chunk_ids = [chunk.chunk_id for chunk in chunks]
            conn.execute(
                """
                DELETE FROM ai_doc_chunks
                WHERE org_id = %s
                  AND source_type = %s
                  AND source_id = %s
                  AND chunk_id <> ALL(%s)
                """,
                (org_id, source_type, source_id, chunk_ids),
            )

        return len(updated_chunks)

    def _search_db(
        self,
        org_id: str,
        source_type: str,
        query: str,
        source_ids: list[str] | None,
        limit: int,
    ) -> list[SearchResult]:
        embedding = self._embed_texts([query])[0]
        vector_literal = "[" + ",".join(f"{v:.6f}" for v in embedding) + "]"
        with psycopg.connect(settings.DATABASE_URL, autocommit=True) as conn:
            if source_ids:
                rows = conn.execute(
                    """
                    SELECT source_id, chunk_id, title, heading_path, content, metadata,
                           1 - (embedding <=> %s::vector) AS score
                    FROM ai_doc_chunks
                    WHERE org_id = %s AND source_type = %s AND source_id = ANY(%s)
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (vector_literal, org_id, source_type, source_ids, vector_literal, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT source_id, chunk_id, title, heading_path, content, metadata,
                           1 - (embedding <=> %s::vector) AS score
                    FROM ai_doc_chunks
                    WHERE org_id = %s AND source_type = %s
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (vector_literal, org_id, source_type, vector_literal, limit),
                ).fetchall()

        return [
            SearchResult(
                source_id=row[0],
                chunk_id=row[1],
                title=row[2],
                heading_path=row[3],
                content=row[4],
                metadata=row[5] or None,
                score=float(row[6] or 0),
            )
            for row in rows
        ]

    def _index_memory(
        self,
        org_id: str,
        source_type: str,
        source_id: str,
        chunks: list[IndexedChunk],
    ) -> int:
        updated = 0
        prefix = (org_id, source_type, source_id)
        existing = {
            key[3]: chunk for key, chunk in self._memory.items() if key[:3] == prefix
        }
        for chunk in chunks:
            key = (*prefix, chunk.chunk_id)
            if existing.get(chunk.chunk_id, None) and existing[chunk.chunk_id].content_hash == chunk.content_hash:
                continue
            updated += 1
            self._memory[key] = chunk

        valid_ids = {chunk.chunk_id for chunk in chunks}
        self._memory = {
            key: chunk
            for key, chunk in self._memory.items()
            if key[:3] != prefix or key[3] in valid_ids
        }
        return updated

    def _search_memory(
        self,
        org_id: str,
        source_type: str,
        query: str,
        source_ids: list[str] | None,
        limit: int,
    ) -> list[SearchResult]:
        terms = {t for t in query.lower().split() if len(t) > 2}
        scored: list[SearchResult] = []
        for (chunk_org, chunk_type, chunk_source, _), chunk in self._memory.items():
            if chunk_org != org_id or chunk_type != source_type:
                continue
            if source_ids and chunk_source not in source_ids:
                continue
            haystack = f"{chunk.title or ''} {chunk.content}".lower()
            score = sum(1 for term in terms if term in haystack)
            if score == 0:
                continue
            scored.append(
                SearchResult(
                    source_id=chunk_source,
                    chunk_id=chunk.chunk_id,
                    title=chunk.title,
                    heading_path=chunk.heading_path,
                    content=chunk.content,
                    metadata=chunk.metadata,
                    score=float(score),
                )
            )
        scored.sort(key=lambda item: item.score, reverse=True)
        return scored[:limit]

    def _embed_texts(self, texts: list[str]) -> list[list[float]]:
        if settings.OPENAI_API_KEY:
            try:
                from langchain_openai import OpenAIEmbeddings

                embedder = OpenAIEmbeddings(
                    model=settings.OPENAI_EMBEDDING_MODEL,
                    api_key=settings.OPENAI_API_KEY,
                )
                return embedder.embed_documents(texts)
            except Exception:
                pass
        return [self._hash_embedding(text) for text in texts]

    def _hash_embedding(self, text: str) -> list[float]:
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest(), 16)
        rng = random.Random(seed)
        return [rng.uniform(-1, 1) for _ in range(_VECTOR_DIM)]

    def _chunk_pk(self, org_id: str, source_type: str, source_id: str, chunk_id: str) -> str:
        key = f"{org_id}:{source_type}:{source_id}:{chunk_id}"
        return hashlib.sha256(key.encode("utf-8")).hexdigest()


_STORE: DocumentIndexStore | None = None


def get_index_store() -> DocumentIndexStore:
    global _STORE
    if _STORE is None:
        _STORE = DocumentIndexStore()
    return _STORE
