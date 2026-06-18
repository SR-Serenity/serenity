import json

from langchain_openai import ChatOpenAI

from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import PipelineState
from src.core.config import settings

_SYNTHESIZER_PROMPT = """\
You are the answer composer for Serenity AI, a team workspace assistant.

# Goal
Compose one clear, accurate, user-facing response from the raw data provided \
by the sub-agents below. The raw data contains retrieved records — your job \
is to turn those facts into a helpful, well-written answer.

# Success criteria
- The answer directly addresses the user's request.
- Every claim is grounded in the raw data provided — nothing fabricated.
- The response is in {language}.
- The tone is helpful, concise, and professional.

# Constraints
- Do NOT invent facts not present in the raw data.
- Do NOT repeat the raw data verbatim — synthesize it into natural prose.
- If the raw data contains an error, acknowledge it clearly rather than guessing.
- For proposed actions (scheduling, edits): describe what is about to happen \
  and ask the user to confirm or decline. Be specific — mention title, date, \
  attendees, etc.

# Raw data from sub-agents
{raw_data}

# User request
{user_request}

# Output
Write the final answer only — no headers, no "Here is the answer:" prefix. \
Keep it concise: 1–4 sentences for simple queries, structured lists for \
multi-item results.

<verification_loop>
Before finalizing:
- Does the answer fully address the user's request?
- Is every fact grounded in the raw data above?
- Is it written in {language}?
- For proposals: does it describe what will change and ask for confirmation?
</verification_loop>
"""

_GREETING_PROMPT = """\
You are Serenity AI, a friendly workspace assistant.
Reply naturally to the user's message in {language}. Keep it to 1–2 sentences.
If it is a greeting, greet back and briefly mention you can help with tasks, \
meetings, email, wiki pages, and workspace questions.
User: {message}
"""


def synthesizer_node(state: PipelineState) -> dict:
    language = state.get("detected_language", "English") or "English"
    responses = state.get("domain_agent_response", [])

    # Proposals from any agent (schedule, wiki edit, etc.)
    proposed_actions = [a for r in responses for a in r.proposed_actions]

    # Chat assist runs without workspace data — pass its text straight through.
    chat_assist = next((r for r in responses if r.domain == Domain.CHAT_ASSIST and r.text), None)
    if chat_assist and not proposed_actions:
        return {"answer": chat_assist.text}

    # No agents produced data (greeting / unknown intent).
    data_responses = [r for r in responses if r.text or r.error]
    if not data_responses and not proposed_actions:
        return {"answer": _generate_greeting(state, language)}

    # Build the raw data block for the synthesizer LLM.
    raw_data = _build_raw_data_block(responses, proposed_actions)
    user_request = _latest_user_text(state)

    answer = _compose(raw_data=raw_data, user_request=user_request, language=language)
    return {"answer": answer}


def _compose(raw_data: str, user_request: str, language: str) -> str:
    if not settings.OPENAI_API_KEY:
        return raw_data or "Serenity AI is connected. Send a workspace question to begin."
    try:
        llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0.3)
        result = llm.invoke(
            _SYNTHESIZER_PROMPT.format(
                language=language,
                raw_data=raw_data,
                user_request=user_request,
            )
        )
        return str(result.content).strip() or raw_data
    except Exception:
        return raw_data


def _build_raw_data_block(responses, proposed_actions) -> str:
    parts: list[str] = []

    for r in responses:
        if r.error:
            parts.append(f"[{r.domain.value}] ERROR: {r.error}")
        elif r.text:
            parts.append(f"[{r.domain.value}]\n{r.text}")

    if proposed_actions:
        payload_summary = json.dumps(
            [{"type": a.type, "payload": a.payload} for a in proposed_actions],
            default=str,
            indent=2,
        )
        parts.append(f"[proposed_actions]\n{payload_summary}")

    return "\n\n".join(parts) if parts else "(no data retrieved)"


def _generate_greeting(state: PipelineState, language: str) -> str:
    last = _latest_user_text(state)
    if not settings.OPENAI_API_KEY:
        return "Serenity AI is connected. Send a workspace question to begin."
    try:
        llm = ChatOpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0.7)
        result = llm.invoke(_GREETING_PROMPT.format(language=language, message=last))
        return str(result.content).strip()
    except Exception:
        return "Serenity AI is connected. Send a workspace question to begin."


def _latest_user_text(state: PipelineState) -> str:
    for msg in reversed(state.get("messages", [])):
        if getattr(msg, "type", None) == "human":
            return str(msg.content)
    return ""
