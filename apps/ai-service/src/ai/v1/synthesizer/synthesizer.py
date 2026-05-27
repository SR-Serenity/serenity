from langchain_openai import ChatOpenAI

from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import PipelineState
from src.core.config import settings

_LOCALIZE_PROMPT = """\
The user wrote in {language}. Translate this short AI response into {language}. \
Keep it brief and natural. Return ONLY the translated text, nothing else.

Text: {text}"""


def _localize(text: str, language: str) -> str:
    if not language or language.lower() in ("english", "en"):
        return text
    try:
        llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)
        result = llm.invoke(_LOCALIZE_PROMPT.format(language=language, text=text))
        return str(result.content).strip() or text
    except Exception:
        return text


def synthesizer_node(state: PipelineState) -> dict:
    language = state.get("detected_language", "English") or "English"
    responses = state.get("domain_agent_response", [])

    document_response = next(
        (r for r in responses if r.domain == Domain.DOCUMENT_UNDERSTANDING), None
    )
    if document_response and document_response.text:
        return {"answer": document_response.text, "sources": document_response.sources}

    proposed_actions = [a for r in responses for a in r.proposed_actions]
    if proposed_actions:
        return {"answer": _summarize_proposals(proposed_actions, language)}

    workspace_response = next(
        (r for r in responses if r.domain == Domain.WORKSPACE_QA), None
    )
    if workspace_response and workspace_response.text:
        suffix = _localize(" I also found relevant workspace context.", language) if state.get("memories") else ""
        return {"answer": workspace_response.text + suffix}

    if state.get("input_guardrail") and not state["input_guardrail"].is_safe:
        return {"answer": _localize("I cannot process that request safely.", language)}

    if state.get("memories"):
        return {"answer": _localize("I found relevant long-term workspace context.", language)}

    # No agent matched — greeting or unknown. Ask the LLM to respond naturally.
    return {"answer": _generate_greeting(state, language)}


def _summarize_proposals(proposed_actions, language: str) -> str:
    import json
    payloads = json.dumps([{"type": a.type, "payload": a.payload} for a in proposed_actions], default=str)
    try:
        if not settings.OPENAI_API_KEY:
            return _proposal_fallback(language)
        llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)
        result = llm.invoke(
            f"You are Serenity AI. Summarize what you are about to create for the user, based on the proposed action(s) below. "
            f"Be clear and specific (mention title, date/time, attendees, etc.). "
            f"End with a short line asking them to confirm or decline. "
            f"Write in {language}. Be concise (2-4 sentences).\n\nProposed actions: {payloads}"
        )
        return str(result.content).strip()
    except Exception:
        return _proposal_fallback(language)


def _proposal_fallback(language: str) -> str:
    return _localize(
        "Nothing has been changed yet. Review the proposal below, then confirm or decline.",
        language,
    )


def _generate_greeting(state: PipelineState, language: str) -> str:
    last = ""
    for msg in reversed(state.get("messages", [])):
        if getattr(msg, "type", None) == "human":
            last = str(msg.content)
            break
    try:
        if not settings.OPENAI_API_KEY:
            return _fallback_answer(language)
        llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0.7)
        result = llm.invoke(
            f"You are Serenity AI, a friendly workspace assistant. "
            f"Reply naturally to the user's message in {language}. Keep it short (1-2 sentences). "
            f"If it's a greeting, greet back and briefly mention you can help with tasks, meetings, and workspace questions. "
            f"User: {last}"
        )
        return str(result.content).strip()
    except Exception:
        return _fallback_answer(language)


def _fallback_answer(language: str) -> str:
    return _localize(
        "Serenity AI is connected. Send a workspace question or attach a file to begin.",
        language,
    )
