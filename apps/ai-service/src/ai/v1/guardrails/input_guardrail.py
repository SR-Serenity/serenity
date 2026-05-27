from src.ai.v1.contexts.schemas.state import InputGuardrail


def validate_input(user_input: str) -> InputGuardrail:
    lowered = user_input.lower()
    blocked_markers = ("ignore previous instructions", "system override", "exfiltrate")
    reasons = [marker for marker in blocked_markers if marker in lowered]
    return InputGuardrail(is_safe=not reasons, reasons=reasons)
