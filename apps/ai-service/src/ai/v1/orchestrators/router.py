from typing import Literal

from langgraph.types import Send

from src.ai.v1.contexts.schemas.state import IntentDomain, PipelineState
from src.ai.v1.orchestrators.intent_registry import INTENT_REGISTRY

CONFIDENCE_THRESHOLD = 0.6


def route_to_agents(
    intents: list[IntentDomain] | None,
    state: PipelineState,
) -> list[Send] | Literal["synthesizer"]:
    if not intents:
        return "synthesizer"

    qualified = [intent for intent in intents if intent.confidence >= CONFIDENCE_THRESHOLD]
    if not qualified:
        return "synthesizer"

    sends: list[Send] = []
    for intent in qualified:
        if intent.domain not in INTENT_REGISTRY:
            raise ValueError(f"Domain {intent.domain} not found in registry")
        sends.append(Send(intent.domain.value, state))
    return sends
