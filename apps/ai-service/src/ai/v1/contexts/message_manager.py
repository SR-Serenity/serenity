"""Manages conversation context window with memory extraction."""

from langchain_core.messages import AnyMessage, SystemMessage

from src.ai.v1.agents.memory_writer import memory_writer_agent


class ConversationContextManager:
    """Manages context window by keeping recent messages and extracting summaries."""

    def __init__(self, max_tokens: int = 8000, message_window: int = 20):
        """
        Args:
            max_tokens: Maximum tokens to keep in context window
            message_window: Minimum number of recent messages to always keep
        """
        self.max_tokens = max_tokens
        self.message_window = message_window

    def estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 chars ≈ 1 token for most LLMs)."""
        return len(text) // 4 + 1

    def trim_messages(
        self,
        messages: list[AnyMessage],
        user_id: str,
        org_id: str,
        memories: list[str] | None = None,
    ) -> tuple[list[AnyMessage], list[str]]:
        """
        Trim messages to fit context window while preserving recency.
        Returns trimmed messages and updated memories.
        """
        if len(messages) <= self.message_window:
            return messages, memories or []

        # Count tokens from newest messages
        recent_messages = []
        token_count = 0

        # Always include memories as context
        if memories:
            memory_text = "\n".join(memories)
            token_count += self.estimate_tokens(memory_text)

        # Add recent messages until we hit the limit
        for msg in reversed(messages):
            msg_tokens = self.estimate_tokens(str(msg.content))
            if token_count + msg_tokens > self.max_tokens:
                break
            recent_messages.append(msg)
            token_count += msg_tokens

        recent_messages.reverse()

        # If we removed messages, create a summary
        removed_count = len(messages) - len(recent_messages)
        updated_memories = list(memories) if memories else []

        if removed_count > 0:
            # Summarize the conversation segment being removed
            old_messages = messages[:removed_count]
            summary = memory_writer_agent.summarize_conversation(
                old_messages + recent_messages,
                window_size=len(recent_messages),
            )
            if summary and summary not in updated_memories:
                updated_memories.insert(0, summary)
                # Keep only recent 10 memories to avoid memory bloat
                updated_memories = updated_memories[:10]

        return recent_messages, updated_memories

    def build_context_with_memories(
        self, messages: list[AnyMessage], memories: list[str] | None = None
    ) -> list[AnyMessage]:
        """Build final messages list with memories prepended as context."""
        if not memories:
            return messages

        # Add memories as system message at the start
        memory_text = "\n".join(f"• {m}" for m in memories)
        memory_context = SystemMessage(
            content=f"[Conversation Context]\n{memory_text}\n\n"
            "Use this context to maintain continuity with previous discussions."
        )

        return [memory_context] + messages
