"""General document/file understanding agent."""

from collections import defaultdict
from dataclasses import dataclass
from typing import Iterable

from src.api.internal.v1.schemas import FileMetadata, Source


@dataclass
class DocumentChunk:
    org_id: str
    file_id: str
    page: int
    text: str
    title: str | None = None
    url: str | None = None


class DocumentUnderstandingAgent:
    name = "DocumentUnderstandingAgent"

    def __init__(self) -> None:
        self._chunks: dict[tuple[str, str], list[DocumentChunk]] = defaultdict(list)

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def index_file(
        self,
        *,
        org_id: str,
        file: FileMetadata,
        text: str | None = None,
        pages: list[str] | None = None,
    ) -> int:
        page_texts = pages if pages is not None else [text or ""]
        chunks = list(self._chunk_pages(org_id=org_id, file=file, page_texts=page_texts))
        self._chunks[(org_id, file.file_id)] = chunks
        return len(chunks)

    def ask(self, *, org_id: str, file_ids: list[str], question: str) -> tuple[str, list[Source]]:
        candidates = [
            chunk
            for file_id in file_ids
            for chunk in self._chunks.get((org_id, file_id), [])
        ]
        ranked = sorted(candidates, key=lambda chunk: _score(question, chunk.text), reverse=True)
        relevant = [chunk for chunk in ranked[:4] if _score(question, chunk.text) > 0]
        if not relevant:
            return (
                "I could not find indexed file content that answers that question.",
                [],
            )

        answer = "Based on the indexed file content: " + " ".join(
            _snippet(chunk.text) for chunk in relevant[:2]
        )
        sources = [
            Source(
                file_id=chunk.file_id,
                page=chunk.page,
                title=chunk.title,
                url=chunk.url,
                snippet=_snippet(chunk.text),
            )
            for chunk in relevant
        ]
        return answer, sources

    def _chunk_pages(
        self,
        *,
        org_id: str,
        file: FileMetadata,
        page_texts: Iterable[str],
    ) -> Iterable[DocumentChunk]:
        for page_index, page_text in enumerate(page_texts, start=1):
            normalized = " ".join((page_text or "").split())
            if not normalized:
                continue
            for chunk_text in _fixed_chunks(normalized):
                yield DocumentChunk(
                    org_id=org_id,
                    file_id=file.file_id,
                    page=page_index,
                    text=chunk_text,
                    title=file.title,
                    url=file.source_url,
                )


def _fixed_chunks(text: str, size: int = 1200, overlap: int = 150) -> Iterable[str]:
    start = 0
    while start < len(text):
        yield text[start : start + size]
        next_start = start + size - overlap
        if next_start <= start:
            break
        start = next_start


def _score(question: str, text: str) -> int:
    query_terms = {term for term in question.lower().split() if len(term) > 2}
    text_terms = set(text.lower().split())
    return len(query_terms & text_terms)


def _snippet(text: str, limit: int = 260) -> str:
    compact = " ".join(text.split())
    return compact if len(compact) <= limit else compact[: limit - 3] + "..."
