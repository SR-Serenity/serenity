"""Proposal-first task creation agent."""

import re

from src.api.internal.v1.schemas import ChatMessage, ProposedAction


class TaskCreatorAgent:
    name = "TaskCreatorAgent"

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def propose(self, messages: list[ChatMessage]) -> ProposedAction | None:
        text = _latest_user_text(messages)
        lowered = text.lower()
        if not any(keyword in lowered for keyword in ["task", "todo", "to-do", "assign"]):
            return None

        return ProposedAction(
            type="CREATE_TASK",
            confidence=0.62,
            payload={
                "title": _clean_title(text, default="New task"),
                "description": text,
                "assignee": _extract_after(text, "assign to"),
                "dueDate": _extract_after(text, "due"),
            },
        )


def _latest_user_text(messages: list[ChatMessage]) -> str:
    for message in reversed(messages):
        if message.role == "user":
            return message.content.strip()
    return ""


def _clean_title(text: str, default: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return default
    return cleaned[:80]


def _extract_after(text: str, marker: str) -> str | None:
    match = re.search(re.escape(marker) + r"\s+([^,.]+)", text, flags=re.IGNORECASE)
    return match.group(1).strip() if match else None
