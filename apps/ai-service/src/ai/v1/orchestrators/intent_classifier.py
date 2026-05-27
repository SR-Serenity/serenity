from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import IntentClassification, IntentDomain, PipelineState


def classify_intent(state: PipelineState) -> IntentClassification:
    text = _latest_user_text(state).lower()
    context = state.get("context", {})
    intents: list[IntentDomain] = []

    if context.get("fileIds") or context.get("file_ids"):
        intents.append(IntentDomain(domain=Domain.DOCUMENT_UNDERSTANDING, confidence=0.95))

    if any(keyword in text for keyword in ["task", "todo", "to-do", "assign"]):
        intents.append(IntentDomain(domain=Domain.TASK_CREATOR, confidence=0.9))

    if any(keyword in text for keyword in ["meeting", "schedule", "book a room", "room"]):
        intents.append(IntentDomain(domain=Domain.MEETING_SCHEDULER, confidence=0.9))

    if not intents:
        intents.append(IntentDomain(domain=Domain.WORKSPACE_QA, confidence=0.7))

    return IntentClassification(intent=intents, language="English")


def _latest_user_text(state: PipelineState) -> str:
    for message in reversed(state["messages"]):
        if getattr(message, "type", None) == "human":
            return str(message.content)
    return ""
