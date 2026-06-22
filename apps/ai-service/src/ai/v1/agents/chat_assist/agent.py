"""Chat Assist agent — writing help, translation, summarization, drafting."""

import logging
from typing import Literal

from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from src.api.internal.v1.schemas import ProposedAction
from src.core.config import openai_api_key_secret, settings

logger = logging.getLogger(__name__)

_MAX_CONTEXT_MESSAGES = 30

_SYSTEM_PROMPT = """\
You are Copilot, an AI assistant embedded in Serenity — a team collaboration platform.
You help team members directly inside their workspace.

# Your capabilities
- Draft chat messages or replies for the current conversation
- Draft emails (compose to, subject, body)
- Write or improve messages (professional, friendly, announcements)
- Translate text between any languages
- Summarize conversations or extract key points
- Answer general questions
- Give recommendations or suggestions

# Output instructions
You MUST respond with a JSON object matching this schema:
{{
  "intent": "draft_chat" | "draft_email" | "general",
  "text": "<short user-facing message, 1-2 sentences>",
  "draft_content": "<full draft text, only for draft_chat>",
  "email_to": "<recipient email or name, only for draft_email>",
  "email_subject": "<email subject, only for draft_email>",
  "email_body": "<full email body, only for draft_email>"
}}

# Intent rules
- Use "draft_chat" when the user asks to draft/write/compose a chat message, reply, or response for a conversation.
- Use "draft_email" when the user asks to draft/write/compose an email.
- Use "general" for everything else (answers, summaries, translation, etc.).

# Field rules
- `text`: Always set. For drafts, say something like "Here's a draft reply:" or \
  "Here's a draft email for you:". For general, this IS the answer.
- `draft_content`: Required when intent = "draft_chat". The actual message text \
  ready to send — never a meta-comment or clarification question. If context is \
  ambiguous, make a reasonable assumption and write the draft anyway.
- `email_to`, `email_subject`, `email_body`: Required when intent = "draft_email". \
  Infer recipient/subject from context if mentioned. Leave empty string if unknown.
- Respond in the same language as the user's request.
- Never include "Copilot:" prefix in any draft text.

{context_hint}
"""

_CONTEXT_HINT_CHAT_NO_HISTORY = """\
# Active context
The user currently has a chat conversation open. If they ask to draft a reply or message,
use intent = "draft_chat" and write the draft in `draft_content`.
"""

_CONTEXT_HINT_CHAT_WITH_HISTORY = """\
# Active conversation
The user is viewing a chat conversation. The messages below are the real thread.
Use them to understand context, identify who said what, and write a fitting reply.

Rules for drafting:
- intent MUST be "draft_chat".
- `draft_content` MUST be the actual reply text the user will send — never a \
  question asking what to write, never a meta-comment like "Happy to help, what \
  should I say?" Just write the reply.
- Base the reply on the most recent message(s) from the other participants.
- Match the tone of the existing conversation (casual, professional, etc.).
- Do NOT start with "Hi" or generic greetings unless the thread calls for it.
- If the user's instruction is vague (e.g. "draft for me"), draft a reply to the \
  last message in the thread anyway — do not ask for clarification.

# Conversation history (oldest → newest)
{history}
"""

_CONTEXT_HINT_NONE = ""


class ChatAssistStructuredOutput(BaseModel):
    intent: Literal["draft_chat", "draft_email", "general"]
    text: str
    draft_content: str | None = None
    email_to: str | None = None
    email_subject: str | None = None
    email_body: str | None = None


class ChatAssistResult(BaseModel):
    text: str
    proposed_actions: list[ProposedAction]


class ChatAssistAgent:
    name = "ChatAssistAgent"

    def __init__(self) -> None:
        self._llm = (
            ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=openai_api_key_secret(),
                temperature=0.7,
            ).with_structured_output(ChatAssistStructuredOutput)
            if settings.OPENAI_API_KEY
            else None
        )

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready" if self._llm else "no_api_key"}

    def run(self, user_message: str, context: dict | None = None) -> ChatAssistResult:
        if not self._llm:
            logger.warning("chat_assist: OPENAI_API_KEY not set")
            return ChatAssistResult(text="AI is not configured.", proposed_actions=[])

        ctx = context or {}
        has_conversation = bool(ctx.get("conversationId") or ctx.get("conversation_id"))

        # Extract recent conversation messages sent from the frontend
        raw_msgs = ctx.get("conversationMessages") or ctx.get("conversation_messages") or []
        conv_msgs = raw_msgs[-_MAX_CONTEXT_MESSAGES:] if raw_msgs else []

        if conv_msgs:
            history_lines = [
                f"{m.get('role', 'unknown')}: {m.get('content', '')}"
                for m in conv_msgs
                if m.get("content")
            ]
            history = "\n".join(history_lines)
            context_hint = _CONTEXT_HINT_CHAT_WITH_HISTORY.format(history=history)
        elif has_conversation:
            context_hint = _CONTEXT_HINT_CHAT_NO_HISTORY
        else:
            context_hint = _CONTEXT_HINT_NONE

        try:
            messages = [
                {"role": "system", "content": _SYSTEM_PROMPT.format(context_hint=context_hint)},
                {"role": "user", "content": user_message},
            ]
            output: ChatAssistStructuredOutput = self._llm.invoke(messages)  # type: ignore[assignment]

            proposed_actions: list[ProposedAction] = []

            if output.intent == "draft_chat" and output.draft_content:
                proposed_actions.append(
                    ProposedAction(
                        type="DRAFT_CHAT_MESSAGE",
                        payload={"content": output.draft_content},
                        confidence=0.95,
                        requires_confirmation=True,
                    )
                )
            elif output.intent == "draft_email":
                proposed_actions.append(
                    ProposedAction(
                        type="DRAFT_EMAIL",
                        payload={
                            "to": output.email_to or "",
                            "subject": output.email_subject or "",
                            "body": output.email_body or "",
                        },
                        confidence=0.95,
                        requires_confirmation=True,
                    )
                )

            return ChatAssistResult(
                text=output.text,
                proposed_actions=proposed_actions,
            )

        except Exception as exc:
            logger.exception("chat_assist: error: %s", exc)
            return ChatAssistResult(text=f"Error: {exc}", proposed_actions=[])


def create_chat_assist_agent() -> ChatAssistAgent:
    return ChatAssistAgent()
