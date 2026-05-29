from deepeval.metrics import AnswerRelevancyMetric, ContextualRecallMetric, FaithfulnessMetric
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

FEATURE_DEFAULT_METRICS: dict[str, list[str]] = {
    "workspace_qa": ["answer_relevancy", "faithfulness", "contextual_recall"],
    "task_creator": ["answer_relevancy", "extraction_accuracy"],
    "meeting_scheduler": ["answer_relevancy", "extraction_accuracy"],
    "document_understanding": ["answer_relevancy", "faithfulness", "contextual_recall"],
    "wiki_editor": ["answer_relevancy", "extraction_accuracy"],
    "chat_assistant": ["answer_relevancy"],
}


def build_metrics(metric_names: list[str]) -> list:
    metrics = []
    for name in metric_names:
        if name == "answer_relevancy":
            metrics.append(AnswerRelevancyMetric(threshold=0.3, model="gpt-4o-mini"))
        elif name == "faithfulness":
            metrics.append(FaithfulnessMetric(threshold=0.3, model="gpt-4o-mini"))
        elif name == "contextual_recall":
            metrics.append(ContextualRecallMetric(threshold=0.3, model="gpt-4o-mini"))
        elif name == "extraction_accuracy":
            metrics.append(
                GEval(
                    name="Extraction Accuracy",
                    evaluation_steps=[
                        "Check whether the actual output correctly identifies all key entities mentioned in the expected output (names, dates, times, locations).",
                        "Penalize missing or incorrect extraction of structured information.",
                        "Award full score if the actual output contains a proposed action with the correct fields.",
                    ],
                    evaluation_params=[
                        LLMTestCaseParams.ACTUAL_OUTPUT,
                        LLMTestCaseParams.EXPECTED_OUTPUT,
                    ],
                    threshold=0.3,
                    model="gpt-4o-mini",
                )
            )
    return metrics


def default_metrics_for_feature(feature: str) -> list[str]:
    return FEATURE_DEFAULT_METRICS.get(feature, ["answer_relevancy"])
