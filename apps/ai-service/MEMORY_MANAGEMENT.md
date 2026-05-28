# Hybrid Memory Management System

## Overview
The system implements **Option 2: Memory Extraction + Sliding Window** to handle growing message history in long conversations.

### Problem Solved
- **Before**: Long conversations would accumulate all messages, bloating the context window
- **After**: Older messages are summarized and stored as "memories", keeping only recent context

---

## Architecture

### Three-Layer System

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Explicit Memories                              │
│ (User-marked preferences, important facts)              │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Implicit Context Extraction                    │
│ (Auto-extracted from conversation exchanges)            │
├─────────────────────────────────────────────────────────┤
│ Layer 3: Recent Message Window                          │
│ (Last ~20 messages, ~8000 tokens max)                   │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### 1. `MemoryWriterAgent` (Enhanced)
**File**: `src/ai/v1/agents/memory_writer/agent.py`

Extracts memories at three levels:

```python
# Explicit: User says "remember" or "important"
extract(text) → "User prefers async communication"

# Implicit: Inferred from exchanges
extract_from_exchange(user, assistant) → "Context: Team uses TypeScript"

# Summarization: Condenses removed messages
summarize_conversation(messages) → "Earlier: discussed architecture..."
```

**Memory Markers**:
- Explicit: "remember", "prefer", "important", "note that"
- Filtered out: secrets, tokens, passwords, API keys

### 2. `ConversationContextManager` 
**File**: `src/ai/v1/contexts/message_manager.py`

Manages the context window and message trimming:

```python
trim_messages(messages, memories) → (trimmed_msgs, updated_memories)
```

**Algorithm**:
1. Count tokens from newest message backwards
2. Stop when reaching `max_tokens` (8000) or `min_messages` (20)
3. Summarize removed messages using `MemoryWriterAgent`
4. Add summary to memories
5. Inject memories as system message context

### 3. Enhanced Graph Runtime
**File**: `src/ai/v1/graph/runtime.py`

Integrated into the chat flow:

```
Input Messages
    ↓
Convert to LangChain messages (user/assistant)
    ↓
Trim context window
    ↓
Extract summaries of removed messages → memories
    ↓
Build final messages with memory context
    ↓
Pass to AI graph
    ↓
Graph's memory_writer_node extracts new memories
    ↓
Store back to runtime_state
```

### 4. Enhanced Graph Builder
**File**: `src/ai/v1/graph/builder.py`

The `memory_writer_node` now:
- Extracts explicit memories from user text
- Extracts implicit memories from latest exchanges
- Keeps memories to max 15 items (prevents bloat)

---

## Configuration

Default settings in `ConversationContextManager`:

```python
max_tokens = 8000      # Context window size
message_window = 20    # Minimum messages to keep
memory_max_items = 15  # Maximum stored memories
```

Adjust in `runtime.py`:

```python
context_manager = ConversationContextManager(
    max_tokens=10000,      # Increase for more context
    message_window=30      # Keep more messages
)
```

---

## Data Flow Example

### Scenario: 100-message conversation

**Initial State**:
- Messages: 100 (user/assistant alternating)
- Memories: [] (empty)
- Tokens: ~12,000

**After trim_messages()**:
- Messages: 20 (recent only)
- Memories: [
    "User prefers async communication",
    "Team uses TypeScript for all projects",
    "Earlier: discussed caching strategy... discussed API design..."
  ]
- Tokens: ~8,000

**Context Passed to AI**:
```
[System Message]:
[Conversation Context]
• User prefers async communication
• Team uses TypeScript for all projects
• Earlier: discussed caching strategy...

[Message 81-100]: Recent conversation
```

---

## Benefits

| Benefit | Impact |
|---------|--------|
| **Reduced Context Size** | Fits more conversations in API limits |
| **Preserved Context** | Memories keep important info from old messages |
| **Automatic Extraction** | No manual summarization needed |
| **Scalable** | Handles conversations of any length |
| **Token Efficient** | Fit more important context vs raw messages |

---

## Memory Storage

Memories are stored per user per org:

```python
runtime_state.user_memories = {
    (org_id, user_id): [
        "Memory 1",
        "Memory 2",
        ...
    ]
}
```

**Persistence**: Currently in-memory (session lifetime)
**Future**: Could persist to database for cross-session memory

---

## Monitoring

To debug memory extraction, check the log output from:

1. **Memory extraction**: `memory_writer_node()` in graph
2. **Context trimming**: `trim_messages()` returns tuple of (msgs, memories)
3. **Token counting**: Each operation logs token estimates

Add debug logging:

```python
# In runtime.py after trimming
print(f"Kept {len(trimmed_messages)} messages, extracted {len(updated_memories)} memories")
print(f"Token estimate: {sum(cm.estimate_tokens(m.content) for m in trimmed_messages)}")
```

---

## Future Enhancements

1. **Persistent Memories**: Store to `memories` table in core-service
2. **Cross-Session Memories**: Load user memories on new conversation start
3. **Semantic Deduplication**: Remove similar memories to prevent bloat
4. **Importance Scoring**: Score memories by relevance to current topic
5. **Hierarchical Summaries**: Multi-level summaries for very long conversations
6. **Vector Storage**: Use embeddings to retrieve relevant old context

---

## Testing

Test the memory system:

```python
# In a test file
from src.ai.v1.contexts.message_manager import ConversationContextManager
from langchain_core.messages import HumanMessage, AIMessage

manager = ConversationContextManager()

messages = [HumanMessage(content="Hello")] * 50
trimmed, memories = manager.trim_messages(messages, "user1", "org1")

print(f"Original: {len(messages)}, Trimmed: {len(trimmed)}, Memories: {len(memories)}")
```

---

## Troubleshooting

### Memories not being extracted
- Check memory markers in `MemoryWriterAgent`
- Verify `memory_writer_node` is in the graph

### Context window too small
- Increase `max_tokens` in `ConversationContextManager`
- Reduce `message_window` if you want to prioritize older memories

### Memories growing unbounded
- Check that `memory_max_items` is being respected
- Monitor `memory_writer_node` in graph logs
