"""Wiki Editor Agent — standalone, focused on editing a single wiki page."""

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from src.ai.v1.agents.wiki_editor.prompts import (
    WIKI_EDITOR_EXPLAIN_HUMAN,
    WIKI_EDITOR_EXPLAIN_SYSTEM,
    WIKI_EDITOR_HUMAN_TEMPLATE,
    WIKI_EDITOR_SYSTEM_PROMPT,
)
from src.api.internal.v1.schemas import ProposedAction
from src.core.config import settings

logger = logging.getLogger(__name__)

_MAX_CONTENT_CHARS = 24_000


class WikiEditorAgent:
    """Inline wiki editor: takes a page + user prompt and returns edited Markdown."""

    name = "WikiEditorAgent"

    def __init__(self) -> None:
        if settings.OPENAI_API_KEY:
            self._llm_edit = ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0.7,
            )
            self._llm_explain = ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0.3,
            )
        else:
            self._llm_edit = None
            self._llm_explain = None

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def edit(
        self,
        *,
        page_id: str,
        page_title: str,
        page_content_markdown: str,
        prompt: str,
    ) -> tuple[str, str]:
        if not self._llm_edit:
            logger.warning("wiki_editor: OPENAI_API_KEY not set — returning original content")
            return "No AI available.", page_content_markdown

        truncated = page_content_markdown[:_MAX_CONTENT_CHARS]
        system_prompt = WIKI_EDITOR_SYSTEM_PROMPT.format(
            page_title=page_title,
            page_content=truncated,
        )
        human_message = WIKI_EDITOR_HUMAN_TEMPLATE.format(prompt=prompt)

        try:
            response = self._llm_edit.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_message),
            ])
            updated = str(response.content).strip()

            if updated.startswith("```"):
                lines = updated.split("\n")
                inner = lines[1:] if len(lines) > 1 else lines
                if inner and inner[-1].strip() == "```":
                    inner = inner[:-1]
                updated = "\n".join(inner).strip()

            if not updated:
                return "No changes made.", page_content_markdown

            explanation = self._generate_explanation(prompt=prompt)
            return explanation, updated

        except Exception as exc:
            logger.exception("wiki_editor: unexpected error: %s", exc)
            return f"Error: {exc}", page_content_markdown

    def _generate_explanation(self, *, prompt: str) -> str:
        if not self._llm_explain:
            return f'Applied: "{prompt.strip()}"'
        try:
            response = self._llm_explain.invoke([
                SystemMessage(content=WIKI_EDITOR_EXPLAIN_SYSTEM),
                HumanMessage(content=WIKI_EDITOR_EXPLAIN_HUMAN.format(prompt=prompt)),
            ])
            explanation = str(response.content).strip()
            return explanation if explanation else f'Applied: "{prompt.strip()}"'
        except Exception:
            return f'Applied: "{prompt.strip()}"'

    def build_proposed_action(
        self,
        page_id: str,
        page_title: str,
        updated_content_markdown: str,
    ) -> ProposedAction:
        return ProposedAction(
            type="EDIT_WIKI_PAGE",
            payload={
                "pageId": page_id,
                "title": page_title,
                "contentMarkdown": updated_content_markdown,
            },
            confidence=0.95,
            requires_confirmation=True,
        )


wiki_editor_agent = WikiEditorAgent()
