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
- WORKSPACE_QA     : general questions, search, summaries, "what is...", "find...", "who..."
- SCHEDULE_AGENT   : creating tasks, to-dos, events, meetings, calls, appointments, or room bookings in any language
- GREETING         : greetings, small talk, "hi", "hello", "how are you", chitchat
- DOCUMENT_UNDERSTANDING: questions about an attached file or document

Rules:
- Detect intent from meaning, NOT English keywords — work for any language.
- A message can have multiple intents (e.g. SCHEDULE_AGENT + WORKSPACE_QA).
- When unsure between WORKSPACE_QA and another intent, include both.
- Respond ONLY with the JSON object, no markdown, no explanation.

Latest user message: {message}
"""


def classify_intent(state: PipelineState) -> IntentClassification:
    text = _latest_user_text(state)
    context = state.get("context", {})

    # Files always trigger document understanding
    if context.get("fileIds") or context.get("file_ids"):
        return IntentClassification(
            intent=[IntentDomain(domain=Domain.DOCUMENT_UNDERSTANDING, confidence=0.95)],
            language="English",
        )

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
        "DOCUMENT_UNDERSTANDING": Domain.DOCUMENT_UNDERSTANDING,
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


def _heuristic_classification(text: str) -> IntentClassification:
    lowered = text.lower()
    intents: list[IntentDomain] = []
    if any(keyword in lowered for keyword in ["task", "todo", "to-do", "event", "appointment", "time block", "calendar block", "meeting", "call", "sync", "standup", "interview", "book a room", "room", "schedule"]):
        intents.append(IntentDomain(domain=Domain.SCHEDULE_AGENT, confidence=0.9))
    if any(keyword in lowered for keyword in ["what", "who", "find", "search", "know"]):
        intents.append(IntentDomain(domain=Domain.WORKSPACE_QA, confidence=0.9))
    if not intents:
        return IntentClassification(intent=None, language="English")
    return IntentClassification(intent=intents, language="English")


def _latest_user_text(state: PipelineState) -> str:
    for message in reversed(state["messages"]):
        if getattr(message, "type", None) == "human":
            return str(message.content)
    return ""
