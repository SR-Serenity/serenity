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


def build_metrics(metric_names: list[str], feature: str | None = None) -> list:
    metrics = []
    for name in metric_names:
        if name == "answer_relevancy":
            metrics.append(AnswerRelevancyMetric(threshold=0.3, model="gpt-4o-mini"))
        elif name == "faithfulness":
            metrics.append(FaithfulnessMetric(threshold=0.3, model="gpt-4o-mini"))
        elif name == "contextual_recall":
            metrics.append(ContextualRecallMetric(threshold=0.3, model="gpt-4o-mini"))
        elif name == "extraction_accuracy":
            if feature == "task_creator":
                g_eval = GEval(
                    name="Task Creation Accuracy",
                    criteria="Determine if the task is successfully parsed and created with the correct title, due date, description, and status as described in the expected output.",
                    evaluation_steps=[
                        "Verify if the task title is accurately extracted and matches the expected task name.",
                        "Check if the task's due date is correctly identified and aligns with the expected date.",
                        "Check if the task description contains all key details from the expected output.",
                        "Award full score if the task is correctly created and matches the expected output details.",
                    ],
                    evaluation_params=[
                        LLMTestCaseParams.ACTUAL_OUTPUT,
                        LLMTestCaseParams.EXPECTED_OUTPUT,
                    ],
                    threshold=0.3,
                    model="gpt-4o-mini",
                )
            elif feature == "meeting_scheduler":
                g_eval = GEval(
                    name="Meeting Scheduling Accuracy",
                    criteria="Determine if the calendar event or meeting is scheduled at the correct date, time, and with the correct attendees, title, and description as described in the expected output.",
                    evaluation_steps=[
                        "Verify the meeting subject/title matches the expected title.",
                        "Check if the date and time of the meeting match the expected schedule.",
                        "Verify that all required attendees or rooms are included.",
                        "Check if the description includes correct location or conferencing links if specified.",
                    ],
                    evaluation_params=[
                        LLMTestCaseParams.ACTUAL_OUTPUT,
                        LLMTestCaseParams.EXPECTED_OUTPUT,
                    ],
                    threshold=0.3,
                    model="gpt-4o-mini",
                )
            elif feature == "wiki_editor":
                g_eval = GEval(
                    name="Wiki Edit Accuracy",
                    criteria="Determine if the wiki page is correctly created or updated with the exact title, content, or modifications described in the expected output.",
                    evaluation_steps=[
                        "Verify that the wiki page title is correct and matches the expected title.",
                        "Check if the content modifications or markdown content match the expected wiki page content.",
                        "Ensure the tone and structure of the wiki page content align with the expected changes.",
                    ],
                    evaluation_params=[
                        LLMTestCaseParams.ACTUAL_OUTPUT,
                        LLMTestCaseParams.EXPECTED_OUTPUT,
                    ],
                    threshold=0.3,
                    model="gpt-4o-mini",
                )
            else:
                g_eval = GEval(
                    name="Extraction Accuracy",
                    criteria="Verify if the key information, entities, and actions are accurately extracted from the expected output and represented in the actual output.",
                    evaluation_steps=[
                        "Check whether the actual output correctly identifies all key entities and data points mentioned in the expected output (names, dates, values, text details).",
                        "Ensure no incorrect or fabricated information is extracted.",
                        "Verify that the formatting of the extracted data matches the expected structure.",
                    ],
                    evaluation_params=[
                        LLMTestCaseParams.ACTUAL_OUTPUT,
                        LLMTestCaseParams.EXPECTED_OUTPUT,
                    ],
                    threshold=0.3,
                    model="gpt-4o-mini",
                )
            metrics.append(g_eval)
    return metrics


def default_metrics_for_feature(feature: str) -> list[str]:
    return FEATURE_DEFAULT_METRICS.get(feature, ["answer_relevancy"])
