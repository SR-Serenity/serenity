import json

from langchain_openai import ChatOpenAI

from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import IntentClassification, IntentDomain, PipelineState
from src.core.config import settings

_CLASSIFY_PROMPT = """\
You are an intent classifier for a workspace AI assistant.

Classify the user's latest message and respond with ONLY valid JSON:
{{
  "language": "<detected language name in English, e.g. English, Vietnamese, French>",
  "intents": ["<intent1>", "<intent2>"]
}}

Available intents (pick ALL that apply, or just one):
- WIKI_AGENT     : Reading, searching, summarizing, or editing wiki pages and knowledge base articles.
- CHAT_AGENT     : Reading, searching, or summarizing chat conversations and messages.
- CALENDAR_AGENT : Querying, updating, or deleting calendar events and tasks.
- CONTACTS_AGENT : Finding people, team members, or contacts in the directory.
- MAIL_AGENT     : Reading, searching, or sending emails.
- SCHEDULE_AGENT : Creating brand-new calendar items — tasks, events, meetings, or room bookings.
- CHAT_ASSIST    : Writing help, translation, grammar — ONLY when the content is already in the message.
- GREETING       : Greetings, small talk, or chitchat.

Rules:
- Work for any language — detect intent from meaning, not keywords.
- A message can have multiple intents; include all that apply.
- When the user refers to "this page/document" → WIKI_AGENT, "this conversation/channel" → CHAT_AGENT, \
"this task/event" → CALENDAR_AGENT (based on active context below).
- When multiple contexts are active (e.g. both a wiki page and a chat conversation are open), \
  choose the domain based on what the user's message is actually about — do not assume the user \
  is asking about all open contexts.
- Use CHAT_ASSIST only when no workspace data is needed.
- When genuinely unsure, pick the domain that best matches the phrasing; only fall back to the \
  active context as a tiebreaker.
- Respond ONLY with the JSON object, no markdown, no explanation.

Active context: {active_context}
Latest user message: {message}
"""

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


def classify_intent(state: PipelineState) -> IntentClassification:
    text = _latest_user_text(state)
    context = state.get("context", {}) or {}
    active_context_desc = _describe_active_context(context)

    if not settings.OPENAI_API_KEY:
        return IntentClassification(intent=None, language="English")

    try:
        llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)
        raw = llm.invoke(_CLASSIFY_PROMPT.format(message=text, active_context=active_context_desc))
        data = json.loads(str(raw.content))
        language: str = data.get("language", "English") or "English"
        intent_names: list[str] = data.get("intents", ["WIKI_AGENT"])
    except Exception:
        return IntentClassification(intent=None, language="English")

    intents = [
        IntentDomain(domain=d, confidence=0.9)
        for name in intent_names
        if (d := _NAME_TO_DOMAIN.get(name)) is not None
    ]

    if not intents:
        fallback = _infer_from_context(context)
        if fallback:
            return IntentClassification(intent=[IntentDomain(domain=fallback, confidence=0.85)], language=language)
        return IntentClassification(intent=None, language=language)

    return IntentClassification(intent=intents, language=language)


def _infer_from_context(context: dict) -> Domain | None:
    if context.get("taskId"):
        return Domain.CALENDAR_AGENT
    if context.get("wikiPageId"):
        return Domain.WIKI_AGENT
    if context.get("conversationId"):
        return Domain.CHAT_AGENT
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
