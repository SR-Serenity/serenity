"""Prompts for the memory writer agent."""

EXTRACT_PROMPT = """\
You are a memory extraction assistant. Read the following user message and decide if it \
contains information worth storing as a long-term memory for future conversations.

Worth remembering:
- Personal preferences ("I prefer...", "I always...", "Please don't...")
- Project or team context ("My team uses...", "Our goal is...", "We're building...")
- Important facts ("Remember that...", "Note that...", "Important:")

NOT worth remembering:
- Questions, requests, or task instructions
- Small talk or greetings
- Anything containing credentials, tokens, passwords, or API keys

User message: {text}

If worth remembering, output the memory text (1–2 sentences max). \
If not worth remembering, output nothing (empty string only). No explanation."""

EXCHANGE_PROMPT = """\
You are a memory extraction assistant. Read this user–assistant exchange and decide \
if it reveals a lasting fact or preference the assistant should remember for future conversations.

Worth remembering: recurring project facts, explicit preferences, team/organization context.
NOT worth remembering: one-off questions, answers to specific tasks, greetings.

User: {user_msg}
Assistant: {assistant_msg}

If there is something worth remembering, output it as 1 concise sentence. \
Otherwise output nothing (empty string only). No explanation."""
