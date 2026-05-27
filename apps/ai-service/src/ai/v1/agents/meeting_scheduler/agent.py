"""Proposal-first meeting and room scheduling agent."""

import re
from datetime import UTC, datetime
from typing import Literal

from src.api.internal.v1.schemas import ChatMessage, ProposedAction


class MeetingSchedulerAgent:
    name = "MeetingSchedulerAgent"

    def health(self) -> dict[str, str]:
        return {"agent": self.name, "status": "ready"}

    def propose(self, messages: list[ChatMessage]) -> ProposedAction | None:
        text = _latest_user_text(messages)
        lowered = text.lower()
        if not any(keyword in lowered for keyword in ["meeting", "schedule", "book a room", "room"]):
            return None

        action_type: Literal["CREATE_MEETING", "BOOK_ROOM"] = (
            "BOOK_ROOM" if "room" in lowered else "CREATE_MEETING"
        )
        return ProposedAction(
            type=action_type,
            confidence=0.58,
            payload={
                "title": _clean_title(text, default="New meeting"),
                "description": text,
                "requestedAt": datetime.now(UTC).isoformat(timespec="seconds"),
                "roomRequirements": _room_requirements(lowered),
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


def _room_requirements(text: str) -> dict[str, object]:
    requirements: dict[str, object] = {}
    capacity = re.search(r"(\d+)\s+(people|persons|attendees)", text)
    if capacity:
        requirements["capacity"] = int(capacity.group(1))
    if "projector" in text:
        requirements["projector"] = True
    if "whiteboard" in text:
        requirements["whiteboard"] = True
    return requirements
