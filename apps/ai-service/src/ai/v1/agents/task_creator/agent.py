"""LLM-powered task creation agent."""

import json
import re

from langchain_openai import ChatOpenAI

from src.api.internal.v1.schemas import ChatMessage, ProposedAction
from src.core.config import settings

_EXTRACT_PROMPT = """\
You are a task management assistant. Given the conversation below, do one of two things:

1. If the user has provided a clear task description (what needs to be done), extract it and respond with JSON:
{{"ready": true, "title": "<concise task title, max 80 chars>", "description": "<fuller description or null>", "dueDate": "<ISO 8601 date string or null>", "assignee": "<name or null>"}}

2. If the task description is too vague (e.g. user just said 'create a task' with no details), respond with JSON:
{{"ready": false, "question": "<a short friendly question asking what the task is about>"}}

Rules:
- Today's date is {today}.
- The "question" value MUST be written in the same language the user is writing in.
- Respond ONLY with valid JSON — no markdown, no extra text.

Conversation:
{conversation}
"""


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0,
    )


class TaskCreatorAgent:
    name = "TaskCreatorAgent"

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def needs_clarification(self, messages: list[ChatMessage]) -> str | None:
        result = _call_llm(messages)
        if not result.get("ready"):
            return result.get("question", "What should this task be about?")
        return None

    def propose(self, messages: list[ChatMessage]) -> ProposedAction | None:
        result = _call_llm(messages)
        if not result.get("ready"):
            return None
        return ProposedAction(
            type="CREATE_TASK",
            confidence=0.85,
            payload={
                "title": result.get("title", "New task"),
                "description": result.get("description"),
                "dueDate": result.get("dueDate"),
                "assignee": result.get("assignee"),
            },
        )


def _conversation_text(messages: list[ChatMessage]) -> str:
    return "\n".join(f"{m.role.upper()}: {m.content}" for m in messages)


def _call_llm(messages: list[ChatMessage]) -> dict:
    from datetime import date
    if not settings.OPENAI_API_KEY:
        return _fallback_extract(messages)
    today = date.today().isoformat()
    prompt = _EXTRACT_PROMPT.format(
        today=today,
        conversation=_conversation_text(messages),
    )
    llm = _get_llm()
    try:
        response = llm.invoke(prompt)
        return json.loads(str(response.content))
    except (json.JSONDecodeError, AttributeError, Exception):
        return _fallback_extract(messages)


def _fallback_extract(messages: list[ChatMessage]) -> dict:
    text = _latest_user_text(messages)
    lowered = text.lower()
    if "task" not in lowered and "to-do" not in lowered and "todo" not in lowered:
        return {"ready": False, "question": "What should this task be about?"}

    title = re.sub(r"\s+", " ", text).strip()
    if not title or title.lower() in {"create a task", "add a task", "new task"}:
        return {"ready": False, "question": "What should this task be about?"}
    return {
        "ready": True,
        "title": title[:80],
        "description": text,
        "dueDate": None,
        "assignee": None,
    }


def _latest_user_text(messages: list[ChatMessage]) -> str:
    for message in reversed(messages):
        if message.role == "user":
            return message.content.strip()
    return ""
