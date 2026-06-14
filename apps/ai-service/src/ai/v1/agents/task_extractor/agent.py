"""Task Extractor Agent — extracts structured follow-up tasks from a conversation.

Distinct from the schedule agent (which proposes a single calendar action from an
instruction): this agent reads an entire conversation and proposes 1-5 follow-up
tasks for the user to review and confirm.
"""

import logging
from typing import Literal

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from src.ai.v1.agents.task_extractor.prompts import build_system_prompt
from src.core.config import settings

logger = logging.getLogger(__name__)


class ExtractedTask(BaseModel):
    """A single proposed task extracted from workspace context."""

    title: str = Field(description="Concise, action-oriented task title")
    description: str | None = Field(
        default=None, description="Optional fuller description"
    )
    assignee_name: str | None = Field(
        default=None, description="Person responsible, only if clearly mentioned"
    )
    due_date: str | None = Field(
        default=None, description="Due date as YYYY-MM-DD, only if mentioned/inferable"
    )
    priority: Literal["low", "medium", "high"] = Field(default="medium")
    reason: str = Field(description="Short reason this task is suggested, grounded in the source")


class ExtractedTasks(BaseModel):
    """Wrapper for the list of extracted tasks (structured output target)."""

    tasks: list[ExtractedTask] = Field(default_factory=list)


class TaskExtractorAgent:
    name = "TaskExtractorAgent"

    def __init__(self) -> None:
        self._llm = (
            ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0,
            ).with_structured_output(ExtractedTasks)
            if settings.OPENAI_API_KEY
            else None
        )

    def health(self) -> dict[str, str]:
        status = "ready" if self._llm else "degraded"
        return {"agent": self.name, "status": status}

    def extract(
        self,
        *,
        conversation_context: list[dict[str, str]],
        source_title: str | None = None,
    ) -> list[ExtractedTask]:
        if not self._llm:
            logger.warning("task_extractor: OPENAI_API_KEY not set, using fallback")
            return self._fallback(conversation_context, source_title)

        context_lines = [
            f"{msg.get('role', 'unknown')}: {msg.get('content', '')}"
            for msg in conversation_context
            if msg.get("content")
        ]
        context_str = "\n".join(context_lines) if context_lines else "(empty conversation)"

        system_prompt = build_system_prompt(source_title)
        user_prompt = f"Conversation:\n{context_str}\n\nExtract the follow-up tasks."

        try:
            result = self._llm.invoke(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ]
            )
            tasks = result.tasks if isinstance(result, ExtractedTasks) else []
            return tasks[:5]
        except Exception as exc:
            logger.exception("task_extractor: unexpected error: %s", exc)
            return self._fallback(conversation_context, source_title)

    def _fallback(
        self,
        conversation_context: list[dict[str, str]],
        source_title: str | None,
    ) -> list[ExtractedTask]:
        """Deterministic minimal proposal so the UI flow works without an LLM."""
        last_message = next(
            (
                msg.get("content", "")
                for msg in reversed(conversation_context)
                if msg.get("content")
            ),
            "",
        )
        snippet = (last_message or "Follow up on the discussion").strip()
        title = snippet[:77] + "…" if len(snippet) > 78 else snippet
        return [
            ExtractedTask(
                title=f"Follow up: {title}",
                description=None,
                assignee_name=None,
                due_date=None,
                priority="medium",
                reason=f"Suggested from {source_title or 'the conversation'} (offline fallback).",
            )
        ]


task_extractor_agent = TaskExtractorAgent()
