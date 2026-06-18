"""Graph-level constants shared across the runtime and stream adapter."""

# Nodes whose LLM token stream is the final user-facing response.
# Any node that can produce the answer shown to the user must be listed here.
# Synthesizer handles the greeting / proposal-summary path.
STREAMING_NODES: frozenset[str] = frozenset(
    {
        "chat_agent",
        "wiki_agent",
        "calendar_agent",
        "contacts_agent",
        "mail_agent",
        "schedule_agent",
        "task_agent",
        "automation_agent",
        "meeting_agent",
        "synthesizer",
    }
)
