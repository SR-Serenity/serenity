"""Wiki page editing logic — used by the edit_wiki_page_tool."""

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from src.core.config import openai_api_key_secret, settings

logger = logging.getLogger(__name__)

_MAX_CONTENT_CHARS = 24_000

_EDIT_SYSTEM = """\
<ROLE>
You are a precise document editor. You edit wiki pages based on the user's instruction.
Make only the changes needed — preserve everything else exactly as-is.
Match the existing tone, voice, and formatting of the document.
</ROLE>

<WIKI_PAGE>
Title: {page_title}

Current content:
---
{page_content}
---
</WIKI_PAGE>

<STYLE_GUIDELINES>
- Do NOT reformat or reorganize content unless explicitly asked.
- H1 (`#`) is reserved for the page title — never use it in the body.
- Use H2 (`##`) for top-level sections, H3 (`###`) for sub-sections.
- Use `**bold**` for key terms, `*italic*` for definitions.
- Use code blocks for code, commands, or technical output.
- Keep paragraphs concise: 3–5 sentences max.
- When adding content, add substance — not filler.
- Preserve meaning when rewriting; improve clarity and precision.
</STYLE_GUIDELINES>

<OUTPUT_RULES>
- Return ONLY the raw updated Markdown — no preamble, no commentary, no code fences.
- Include the ENTIRE page, not just the changed section.
- Preserve all parts not covered by the instruction.
</OUTPUT_RULES>
"""

_EDIT_HUMAN = "Apply the following instruction to the wiki page:\n\n> {prompt}"

_EXPLAIN_SYSTEM = """\
You summarize document edits in one short sentence (max 15 words).
Describe the result, not the instruction. Example: "Added a Getting Started section with installation steps."
"""

_EXPLAIN_HUMAN = "Instruction: {prompt}\nDescribe what was done in one sentence."


class WikiEditorLogic:
    def __init__(self) -> None:
        self._llm: ChatOpenAI | None
        self._llm_explain: ChatOpenAI | None
        if settings.OPENAI_API_KEY:
            self._llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=openai_api_key_secret(), temperature=0.7)
            self._llm_explain = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=openai_api_key_secret(), temperature=0.3)
        else:
            self._llm = None
            self._llm_explain = None

    def edit(self, *, page_title: str, page_content_markdown: str, prompt: str) -> tuple[str, str]:
        if not self._llm:
            return "AI not configured.", page_content_markdown

        truncated = page_content_markdown[:_MAX_CONTENT_CHARS]
        try:
            response = self._llm.invoke([
                SystemMessage(content=_EDIT_SYSTEM.format(page_title=page_title, page_content=truncated)),
                HumanMessage(content=_EDIT_HUMAN.format(prompt=prompt)),
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
            explanation = self._explain(prompt)
            return explanation, updated
        except Exception as exc:
            logger.exception("wiki edit error: %s", exc)
            return f"Error: {exc}", page_content_markdown

    def _explain(self, prompt: str) -> str:
        if not self._llm_explain:
            return f'Applied: "{prompt.strip()}"'
        try:
            r = self._llm_explain.invoke([
                SystemMessage(content=_EXPLAIN_SYSTEM),
                HumanMessage(content=_EXPLAIN_HUMAN.format(prompt=prompt)),
            ])
            return str(r.content).strip() or f'Applied: "{prompt.strip()}"'
        except Exception:
            return f'Applied: "{prompt.strip()}"'


wiki_editor_logic = WikiEditorLogic()
