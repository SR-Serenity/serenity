from src.ai.v1.contexts.schemas.state import OutputGuardrail, PipelineState


def validate_output(state: PipelineState) -> OutputGuardrail:
    answer = state.get("answer", "")
    if any(marker in answer.lower() for marker in ["api key", "password", "secret token"]):
        return OutputGuardrail(is_safe=False, reasons=["sensitive_output"])
    return OutputGuardrail()
