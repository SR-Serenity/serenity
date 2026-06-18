from dataclasses import dataclass

from langchain.agents import create_agent
from langchain.agents.middleware import ModelRequest, dynamic_prompt
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import IntentClassification, IntentDomain, PipelineState
from src.core.config import openai_api_key_secret, settings


# ── Structured output schema ──────────────────────────────────────────────────

class IntentClassifierOutput(BaseModel):
    language: str
    intents: list[str]
    needs_memory: bool


# ── Per-request context ───────────────────────────────────────────────────────

@dataclass
class ClassifierContext:
    active_context: str
    user_message: str


# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are the intent router for Serenity AI, a workspace assistant.

# Goal
Decide which sub-agents to call based on what the user wants to do, \
taking the currently open workspace item into account.

# Success criteria
- Every intent that materially applies is included.
- `language` is always detected, even for short messages.
- `needs_memory` is true only when past user preferences or behavior \
  would meaningfully improve the answer.

# Available intents
- WIKI_AGENT     : Read, search, summarize, or edit wiki / knowledge-base pages.
- CHAT_AGENT     : Read, search, or recap chat conversations and messages.
- CALENDAR_AGENT : Query, update, or delete existing calendar events and tasks.
- CONTACTS_AGENT : Find people, team members, or contacts in the workspace directory.
- MAIL_AGENT     : Read, search, or send emails.
- SCHEDULE_AGENT : Create new calendar items — tasks, events, meetings, room bookings.
- CHAT_ASSIST    : Writing help, translation, grammar — only when all content \
  is already in the message and no workspace data lookup is needed.
- GREETING       : Greetings, small talk, chitchat.

# Routing rules
- Pick ALL intents that apply; one message can need multiple agents.
- Detect intent from meaning, not keywords; works in any language.
- Use CHAT_ASSIST only when no workspace data lookup is needed.
- Set `needs_memory` true for personalised requests such as \
  "my usual", recommendations, or follow-ups on stated preferences.

# How to use the open workspace context
The user currently has the following item open: {active_context}

Use this as a strong signal when the user's intent is ambiguous or when \
they use pronouns like "this", "it", "here":
- Wiki page open   → if the message could be about reading, editing, or \
  asking a question about that page, include WIKI_AGENT.
- Conversation open → if the message could be about summarising, recapping, \
  or searching that conversation, include CHAT_AGENT.
- Task/event open  → if the message could be about viewing, updating, or \
  acting on that item, include CALENDAR_AGENT.

If the message is clearly about something completely different \
(e.g. user asks to schedule a meeting while a wiki page is open), \
follow the message intent and ignore the open context.

User message: {user_message}
"""


@dynamic_prompt
def _classifier_prompt(request: ModelRequest[ClassifierContext]) -> str:
    ctx = request.runtime.context
    return _SYSTEM_PROMPT.format(
        active_context=ctx.active_context,
        user_message=ctx.user_message,
    )


# ── Agent singleton ───────────────────────────────────────────────────────────

_agent = None


def _get_agent():
    global _agent
    if _agent is None and settings.OPENAI_API_KEY:
        _agent = create_agent(
            ChatOpenAI(model=settings.OPENAI_MODEL, api_key=openai_api_key_secret(), temperature=0),
            tools=[],
            middleware=[_classifier_prompt],
            response_format=IntentClassifierOutput,
            context_schema=ClassifierContext,
            name="intent_classifier",
        )
    return _agent


# ── Name → Domain mapping ─────────────────────────────────────────────────────

_NAME_TO_DOMAIN: dict[str, Domain | None] = {
    "WIKI_AGENT": Domain.WIKI_AGENT,
    "CHAT_AGENT": Domain.CHAT_AGENT,
    "CALENDAR_AGENT": Domain.CALENDAR_AGENT,
    "CONTACTS_AGENT": Domain.CONTACTS_AGENT,
    "MAIL_AGENT": Domain.MAIL_AGENT,
    "SCHEDULE_AGENT": Domain.SCHEDULE_AGENT,
    "CHAT_ASSIST": Domain.CHAT_ASSIST,
    "GREETING": None,
}


# ── Public function ───────────────────────────────────────────────────────────

def classify_intent(state: PipelineState) -> IntentClassification:
    text = _latest_user_text(state)
    context = state.get("context", {}) or {}
    active_context_desc = _describe_active_context(context)

    agent = _get_agent()
    if not agent:
        fallback = _domain_from_context(context)
        if fallback:
            return IntentClassification(
                intent=[IntentDomain(domain=fallback, confidence=0.85)],
                language="English",
                needs_memory=False,
            )
        return IntentClassification(intent=None, language="English", needs_memory=False)

    try:
        result = agent.invoke(
            {"messages": [{"role": "user", "content": text}]},
            context=ClassifierContext(
                active_context=active_context_desc,
                user_message=text,
            ),
        )
        data: IntentClassifierOutput = result["structured_response"]
        language = data.language or "English"
        needs_memory = data.needs_memory
        intent_names = data.intents or []
    except Exception:
        fallback = _domain_from_context(context)
        if fallback:
            return IntentClassification(
                intent=[IntentDomain(domain=fallback, confidence=0.85)],
                language="English",
                needs_memory=False,
            )
        return IntentClassification(intent=None, language="English", needs_memory=False)

    intents = [
        IntentDomain(domain=d, confidence=0.9)
        for name in intent_names
        if (d := _NAME_TO_DOMAIN.get(name)) is not None
    ]

    if not intents:
        fallback = _domain_from_context(context)
        if fallback:
            return IntentClassification(
                intent=[IntentDomain(domain=fallback, confidence=0.85)],
                language=language,
                needs_memory=needs_memory,
            )
        return IntentClassification(intent=None, language=language, needs_memory=False)

    return IntentClassification(intent=intents, language=language, needs_memory=needs_memory)


def _domain_from_context(context: dict) -> Domain | None:
    if context.get("wikiPageId"):
        return Domain.WIKI_AGENT
    if context.get("conversationId"):
        return Domain.CHAT_AGENT
    if context.get("taskId"):
        return Domain.CALENDAR_AGENT
    return None


def _describe_active_context(context: dict) -> str:
    parts = []
    if context.get("wikiPageId"):
        parts.append(f"wiki page (ID: {context['wikiPageId']}) is open")
    if context.get("conversationId"):
        parts.append(f"chat conversation (ID: {context['conversationId']}) is open")
    if context.get("taskId"):
        parts.append(f"task/event (ID: {context['taskId']}) is open")
    return "; ".join(parts) if parts else "none"


def _latest_user_text(state: PipelineState) -> str:
    for message in reversed(state["messages"]):
        if getattr(message, "type", None) == "human":
            return str(message.content)
    return ""
