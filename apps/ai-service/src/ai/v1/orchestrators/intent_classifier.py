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
- WORKSPACE_QA     : Any action that reads, searches, or interacts with existing workspace data — \
including questions, lookups, summaries, chat history, contacts, wiki pages, calendar queries, \
and all email/mail operations (reading, searching, sending, replying, forwarding).
- SCHEDULE_AGENT   : Creating or scheduling new calendar items — tasks, events, meetings, or room bookings.
- GREETING         : Greetings, small talk, or chitchat with no workspace action required.

Rules:
- Work for any language — detect intent from meaning, not keywords.
- A message can have multiple intents; include all that apply.
- When unsure, include WORKSPACE_QA.
- Respond ONLY with the JSON object, no markdown, no explanation.

Latest user message: {message}
"""


def classify_intent(state: PipelineState) -> IntentClassification:
    text = _latest_user_text(state)

    if not settings.OPENAI_API_KEY:
        return _heuristic_classification(text)

    try:
        llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0,
        )
        raw = llm.invoke(_CLASSIFY_PROMPT.format(message=text))
        data = json.loads(str(raw.content))
        language: str = data.get("language", "English") or "English"
        intent_names: list[str] = data.get("intents", ["WORKSPACE_QA"])
    except Exception:
        language = "English"
        intent_names = ["WORKSPACE_QA"]

    _name_to_domain = {
        "WORKSPACE_QA": Domain.WORKSPACE_QA,
        "SCHEDULE_AGENT": Domain.SCHEDULE_AGENT,
        "TASK_CREATOR": Domain.SCHEDULE_AGENT,
        "MEETING_SCHEDULER": Domain.SCHEDULE_AGENT,
        "GREETING": None,  # handled in synthesizer directly
    }

    intents: list[IntentDomain] = []
    for name in intent_names:
        domain = _name_to_domain.get(name)
        if domain is not None:
            intents.append(IntentDomain(domain=domain, confidence=0.9))

    # Pure greeting — no agent needed, synthesizer handles it
    if not intents:
        return IntentClassification(intent=None, language=language)

    return IntentClassification(intent=intents, language=language)


def _heuristic_classification(_text: str) -> IntentClassification:
    # No LLM available — default to WORKSPACE_QA so the agent can decide what to do.
    return IntentClassification(
        intent=[IntentDomain(domain=Domain.WORKSPACE_QA, confidence=0.9)],
        language="English",
    )


def _latest_user_text(state: PipelineState) -> str:
    for message in reversed(state["messages"]):
        if getattr(message, "type", None) == "human":
            return str(message.content)
    return ""
