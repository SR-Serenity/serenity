from src.ai.v1.contexts.schemas.enums import Domain
from src.ai.v1.contexts.schemas.state import PipelineState


def synthesizer_node(state: PipelineState) -> dict:
    responses = state.get("domain_agent_response", [])
    document_response = next(
        (response for response in responses if response.domain == Domain.DOCUMENT_UNDERSTANDING),
        None,
    )
    if document_response and document_response.text:
        return {
            "answer": document_response.text,
            "sources": document_response.sources,
        }

    proposed_actions = [
        action for response in responses for action in response.proposed_actions
    ]
    if proposed_actions:
        return {
            "answer": "I drafted proposed action payloads for your review. Nothing has been changed yet.",
        }

    workspace_response = next(
        (response for response in responses if response.domain == Domain.WORKSPACE_QA),
        None,
    )
    if workspace_response and workspace_response.text:
        suffix = (
            " I also found relevant long-term workspace context."
            if state.get("memories")
            else ""
        )
        return {"answer": workspace_response.text + suffix}

    if state.get("input_guardrail") and not state["input_guardrail"].is_safe:
        return {"answer": "I cannot process that request safely."}

    suffix = " I also found relevant long-term workspace context." if state.get("memories") else ""
    return {
        "answer": (
            "Serenity AI is connected and ready for workspace questions, files, tasks, and meetings."
            + suffix
        )
    }
