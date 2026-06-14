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

    proposed_actions = [a for r in responses for a in r.proposed_actions]
    if proposed_actions:
        return {"answer": _summarize_proposals(proposed_actions, language)}

    chat_assist_response = next(
        (r for r in responses if r.domain == Domain.CHAT_ASSIST), None
    )
    if chat_assist_response and chat_assist_response.text:
        return {"answer": chat_assist_response.text}

    _agent_domains = {Domain.WIKI_AGENT, Domain.CHAT_AGENT, Domain.CALENDAR_AGENT, Domain.CONTACTS_AGENT, Domain.MAIL_AGENT}
    agent_responses = [r for r in responses if r.domain in _agent_domains and r.text]
    if agent_responses:
        combined = "\n\n".join(r.text for r in agent_responses)
        return {"answer": combined}

    if state.get("input_guardrail") and not state["input_guardrail"].is_safe:
        return {"answer": _localize("I cannot process that request safely.", language)}

    if state.get("memories"):
        return {"answer": _localize("I found relevant long-term workspace context.", language)}

    # No agent matched — greeting or unknown. Ask the LLM to respond naturally.
    return {"answer": _generate_greeting(state, language)}


def _summarize_proposals(proposed_actions, language: str) -> str:
    import json
    payloads = json.dumps([{"type": a.type, "payload": a.payload} for a in proposed_actions], default=str)
    if all(a.type == "UPDATE_CALENDAR_ITEM" for a in proposed_actions):
        return _localize(_summarize_updates(proposed_actions), language)
    try:
        if not settings.OPENAI_API_KEY:
            return _proposal_fallback(language)
        llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)
        result = llm.invoke(
            f"You are Serenity AI. Summarize what you are about to create or update for the user, based on the proposed action(s) below. "
            f"Be clear and specific (mention title, date/time, attendees, etc.). "
            f"If the proposal is an update or reschedule, say that it is updating an existing item, not creating a new one. "
            f"End with a short line asking them to confirm or decline. "
            f"Write in {language}. Be concise (2-4 sentences).\n\nProposed actions: {payloads}"
        )
        return str(result.content).strip()
    except Exception:
        return _proposal_fallback(language)


def _summarize_updates(proposed_actions) -> str:
    action = proposed_actions[0]
    payload = action.payload or {}
    title = str(payload.get("title") or "meeting")
    start_at = _pretty_time(payload.get("startAt"))
    end_at = _pretty_time(payload.get("endAt"))
    if start_at and end_at:
        return f"I’m about to update the {title} to {start_at} - {end_at}. Please confirm or decline."
    if start_at:
        return f"I’m about to update the {title} to start at {start_at}. Please confirm or decline."
    return f"I’m about to update the {title}. Please confirm or decline."


def _pretty_time(value) -> str | None:
    if not value:
        return None
    text = str(value)
    if "T" not in text:
        return text
    try:
        from datetime import datetime as _dt
        dt = _dt.fromisoformat(text)
        return dt.strftime("%-I:%M %p")  # e.g. "8:00 AM"
    except (ValueError, AttributeError):
        return text.split("T")[1][:5]  # fallback: "08:00"


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
        "Serenity AI is connected. Send a workspace question to begin.",
        language,
    )
