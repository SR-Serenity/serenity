"""Chat Assistant Agent — inline assistant for generating or translating chat messages."""

import logging

from langchain_openai import ChatOpenAI

from src.ai.v1.agents.chat_assistant.prompts import CHAT_ASSISTANT_SYSTEM_PROMPT
from src.core.config import settings

logger = logging.getLogger(__name__)


class ChatAssistantAgent:
    """Agent that reads chat context and suggests a reply or translates text."""

    name = "ChatAssistantAgent"

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def assist(
        self,
        *,
        conversation_context: list[dict[str, str]],
        prompt: str,
    ) -> str:
        """
        Process the user's prompt using the recent conversation context.

        Args:
            conversation_context: A list of dicts like [{"role": "User A", "content": "Hello!"}]
            prompt: The user's instruction (e.g. "Suggest a polite reply")

        Returns:
            The generated raw text for the message input box.
        """
        # Format the context
        context_lines = []
        for msg in conversation_context:
            role = msg.get("role", "Unknown")
            content = msg.get("content", "")
            context_lines.append(f"{role}: {content}")
        
        context_str = "\n".join(context_lines) if context_lines else "(No prior conversation)"

        system_prompt = CHAT_ASSISTANT_SYSTEM_PROMPT.format(
            conversation_context=context_str,
            prompt=prompt,
        )

        if not settings.OPENAI_API_KEY:
            logger.warning("chat_assistant: OPENAI_API_KEY not set")
            return "No AI available."

        llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0.7,  # Slightly higher for creative replies
        )

        try:
            response = llm.invoke(system_prompt)
            result = str(response.content).strip()
            
            # Clean up accidental quotes if the model wrapped the output
            if result.startswith('"') and result.endswith('"') and len(result) > 1:
                result = result[1:-1].strip()

            return result

        except Exception as exc:
            logger.exception("chat_assistant: unexpected error: %s", exc)
            return f"Error: {exc}"


chat_assistant_agent = ChatAssistantAgent()
