"""Wiki Editor Agent — standalone, focused on editing a single wiki page."""

import logging

from langchain_openai import ChatOpenAI

from src.ai.v1.agents.wiki_editor.prompts import WIKI_EDITOR_SYSTEM_PROMPT
from src.api.internal.v1.schemas import ProposedAction
from src.core.config import settings

logger = logging.getLogger(__name__)

# Max characters of page content to send to the LLM (avoids huge context costs).
_MAX_CONTENT_CHARS = 24_000


class WikiEditorAgent:
    """Inline wiki editor: takes a page + user prompt and returns edited Markdown."""

    name = "WikiEditorAgent"

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
        """
        Apply the user's inline prompt to the wiki page.

        Returns:
            (explanation, updated_content_markdown) — both strings.
        """
        truncated = page_content_markdown[:_MAX_CONTENT_CHARS]
        system_prompt = WIKI_EDITOR_SYSTEM_PROMPT.format(
            page_title=page_title,
            page_content=truncated,
            prompt=prompt,
        )

        if not settings.OPENAI_API_KEY:
            logger.warning("wiki_editor: OPENAI_API_KEY not set — returning original content")
            return "No AI available.", page_content_markdown

        llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0.3,
        )

        try:
            response = llm.invoke(system_prompt)
            updated = str(response.content).strip()

            # Safety: strip accidental code fences the model may add
            if updated.startswith("```"):
                lines = updated.split("\n")
                # Remove first line (```markdown or ```) and last line (```)
                inner = lines[1:] if len(lines) > 1 else lines
                if inner and inner[-1].strip() == "```":
                    inner = inner[:-1]
                updated = "\n".join(inner).strip()

            if not updated:
                return "No changes made.", page_content_markdown

            # Build a short explanation from the prompt
            explanation = f'Applied: "{prompt.strip()}"'
            return explanation, updated

        except Exception as exc:
            logger.exception("wiki_editor: unexpected error: %s", exc)
            return f"Error: {exc}", page_content_markdown

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
