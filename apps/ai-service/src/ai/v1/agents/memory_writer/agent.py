"""LLM-powered long-term memory extraction agent."""

from langchain_core.messages import AIMessage, AnyMessage, HumanMessage
from langchain_openai import ChatOpenAI

from src.ai.v1.agents.memory_writer.prompts import EXCHANGE_PROMPT, EXTRACT_PROMPT
from src.core.config import openai_api_key_secret, settings


class MemoryWriterAgent:
    name = "MemoryWriterAgent"

    def __init__(self) -> None:
        self._llm = (
            ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=openai_api_key_secret(),
                temperature=0,
            )
            if settings.OPENAI_API_KEY
            else None
        )

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def extract(self, text: str) -> str | None:
        """Extract an explicit user memory from a single message using LLM judgement."""
        if not text or not self._llm:
            return None
        try:
            response = self._llm.invoke(EXTRACT_PROMPT.format(text=text))
            result = str(response.content).strip()
            return result if result else None
        except Exception:
            return None

    def summarize_conversation(self, messages: list[AnyMessage], window_size: int = 5) -> str | None:
        """Summarize older messages being removed from the context window."""
        if len(messages) <= window_size:
            return None
        old_messages = messages[:-window_size]
        if not old_messages:
            return None
        summary_parts = []
        for msg in old_messages:
            if isinstance(msg, HumanMessage):
                content = str(msg.content)[:200]
                summary_parts.append(f"- User asked: {content}")
            elif isinstance(msg, AIMessage):
                content = str(msg.content)[:150]
                summary_parts.append(f"  → Assistant responded about: {content}")
        if not summary_parts:
            return None
        return "\n".join(summary_parts[:20])

    def extract_from_exchange(self, user_msg: str, assistant_msg: str) -> str | None:
        """Extract implicit context from a user–assistant exchange using LLM judgement."""
        if not self._llm:
            return None
        try:
            response = self._llm.invoke(
                EXCHANGE_PROMPT.format(
                    user_msg=user_msg[:500],
                    assistant_msg=assistant_msg[:500],
                )
            )
            result = str(response.content).strip()
            return result if result else None
        except Exception:
            return None
