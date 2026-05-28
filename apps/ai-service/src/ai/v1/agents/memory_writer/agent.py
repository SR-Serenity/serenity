"""Selective long-term memory extraction agent."""

from langchain_core.messages import AnyMessage, AIMessage, HumanMessage


class MemoryWriterAgent:
    name = "MemoryWriterAgent"

    secret_markers = ("token", "password", "secret", "api key", "apikey")
    memory_markers = ("remember", "prefer", "preference", "always", "important", "note that")
    summary_markers = ("summarize", "summary", "recap", "recap of", "overview")

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def extract(self, text: str) -> str | None:
        """Extract explicit user memories from conversation."""
        lowered = text.lower()
        if not text or any(secret in lowered for secret in self.secret_markers):
            return None
        if any(marker in lowered for marker in self.memory_markers):
            return text
        return None

    def summarize_conversation(self, messages: list[AnyMessage], window_size: int = 5) -> str | None:
        """Summarize older messages being removed from context window."""
        if len(messages) <= window_size:
            return None

        # Get messages being removed (older than window)
        old_messages = messages[:-window_size]
        if not old_messages:
            return None

        # Extract key exchanges
        summary_parts = []
        for i, msg in enumerate(old_messages):
            if isinstance(msg, HumanMessage):
                content = msg.content[:200]  # Limit length
                summary_parts.append(f"- User asked: {content}")
            elif isinstance(msg, AIMessage):
                content = msg.content[:150]
                summary_parts.append(f"  → Assistant responded about: {content}")

        if not summary_parts:
            return None

        return "\n".join(summary_parts[:20])  # Keep last 20 interactions max

    def extract_from_exchange(self, user_msg: str, assistant_msg: str) -> str | None:
        """Extract implicit context from user-assistant exchanges."""
        combined = f"{user_msg} {assistant_msg}".lower()

        # Look for factual statements or preferences
        keywords = ("my team", "my project", "our goal", "we use", "we prefer", "i prefer")
        if any(kw in combined for kw in keywords):
            return f"Context: {user_msg[:100]}"
        return None
