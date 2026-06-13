"""Chat Assist agent — writing help, translation, summarization, and general conversational AI."""

import logging

from langchain_openai import ChatOpenAI

from src.core.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are Copilot, an AI assistant embedded in Serenity — a team collaboration platform.
You help team members directly inside their chat conversations.

You can:
- Write or improve messages (professional emails, friendly replies, announcements)
- Translate text between any languages
- Summarize conversations or extract key points
- Extract and list action items or follow-up tasks
- Answer general questions based on the conversation context provided
- Give recommendations or suggestions

Rules:
1. Be concise and direct. No lengthy preamble.
2. Respond in the same language as the user's request, unless asked to translate.
3. If listing tasks or items, use a clean numbered or bulleted list.
4. Never pretend to perform actions you cannot — you are a text-only assistant.
5. Do not include "Copilot:" or any self-referential prefix in your response.
"""


class ChatAssistAgent:
    """Graph-compatible agent for writing, translation, summarization, and general Q&A in chat."""

    name = "ChatAssistAgent"

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
        return {"agent": self.name, "status": "ready" if self._llm else "no_api_key"}

    def run(self, user_message: str) -> str:
        if not self._llm:
            logger.warning("chat_assist: OPENAI_API_KEY not set")
            return "AI is not configured."

        try:
            messages = [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ]
            response = self._llm.invoke(messages)
            result = str(response.content).strip()
            return result or "I couldn't generate a response."
        except Exception as exc:
            logger.exception("chat_assist: error: %s", exc)
            return f"Error: {exc}"


def create_chat_assist_agent() -> ChatAssistAgent:
    return ChatAssistAgent()
