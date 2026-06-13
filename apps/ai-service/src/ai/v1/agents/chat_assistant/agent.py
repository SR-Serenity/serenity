"""Chat Assistant Agent — inline assistant for generating or translating chat messages."""

import logging

from langchain_openai import ChatOpenAI

from src.ai.v1.agents.chat_assistant.prompts import CHAT_ASSISTANT_SYSTEM_PROMPT, COPILOT_SYSTEM_PROMPT
from src.core.config import settings

logger = logging.getLogger(__name__)


class ChatAssistantAgent:
    """Agent that reads chat context and suggests a reply or translates text."""

    name = "ChatAssistantAgent"

    def __init__(self) -> None:
        self._llm = (
            ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0.7,
            )
            if settings.OPENAI_API_KEY
            else None
        )

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def assist(
        self,
        *,
        conversation_context: list[dict[str, str]],
        prompt: str,
        copilot_mode: bool = False,
    ) -> str:
        if not self._llm:
            logger.warning("chat_assistant: OPENAI_API_KEY not set")
            return "No AI available."

        context_lines = [
            f"{msg.get('role', 'Unknown')}: {msg.get('content', '')}"
            for msg in conversation_context
        ]
        context_str = "\n".join(context_lines) if context_lines else "(No prior conversation)"
        template = COPILOT_SYSTEM_PROMPT if copilot_mode else CHAT_ASSISTANT_SYSTEM_PROMPT
        system_prompt = template.format(
            conversation_context=context_str,
            prompt=prompt,
        )

        try:
            response = self._llm.invoke(system_prompt)
            result = str(response.content).strip()
            if result.startswith('"') and result.endswith('"') and len(result) > 1:
                result = result[1:-1].strip()
            return result
        except Exception as exc:
            logger.exception("chat_assistant: unexpected error: %s", exc)
            return f"Error: {exc}"


chat_assistant_agent = ChatAssistantAgent()
