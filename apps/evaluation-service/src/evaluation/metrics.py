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
                    criteria=(
                        "Evaluate whether the actual output correctly handles the task creation request from the input. "
                        "The response should show the system understood the intent and extracted the key details: "
                        "task title (or subject), due date if provided, assignee if named, and priority if stated. "
                        "Minor wording differences in the title are acceptable — 'Schedule code review for new feature' "
                        "and 'Code review for new feature' are equivalent. "
                        "Resolving a relative date expression to a concrete date is correct and must NOT be penalized "
                        "(e.g. 'end of week' resolved to 'May 31' or 'Friday' is correct). "
                        "Extra details or a different confirmation style compared to the expected output do NOT affect "
                        "correctness. Penalize only when a key detail explicitly stated in the input is missing or "
                        "factually wrong in the output."
                    ),
                    evaluation_steps=[
                        "Identify the key task details from the input: title/subject, due date, assignee, and priority if any are mentioned.",
                        "Check if the actual output captures the task title — accept minor paraphrasing or word reordering as correct.",
                        "If the input specifies a due date or relative time expression, verify the output's date is consistent with the input (e.g., 'end of week' = Friday, 'tomorrow' = next day, 'next Monday' = correct Monday). Do not penalize for resolving relative dates to concrete dates.",
                        "If the input names a specific assignee or priority, verify the output includes them; if not stated in the input, do not penalize for their absence.",
                        "Verify the output either confirms task creation, shows it is processing the request, or asks a targeted clarifying question — any of these shows the intent was understood.",
                        "Assign a high score when all key details from the input are present and correct; penalize only for missing or factually wrong task information, not for phrasing differences or extra wording.",
                    ],
                    evaluation_params=[
                        LLMTestCaseParams.INPUT,
                        LLMTestCaseParams.ACTUAL_OUTPUT,
                        LLMTestCaseParams.EXPECTED_OUTPUT,
                    ],
                    threshold=0.3,
                    model="gpt-4o-mini",
                )
            elif feature == "meeting_scheduler":
                g_eval = GEval(
                    name="Meeting Scheduling Accuracy",
                    criteria=(
                        "Evaluate whether the actual output correctly handles the meeting or room booking request "
                        "from the input. The response should demonstrate that the system understood the booking intent "
                        "and extracted the correct details (subject/title, date, time, and room or attendees when "
                        "explicitly specified in the input). Minor phrasing differences, extra details, or a slightly "
                        "different confirmation style compared to the expected output do NOT affect correctness — "
                        "focus on whether the key scheduling information from the input is captured correctly. "
                        "Relative date expressions such as 'tomorrow', 'Friday', or 'next week' are correct as long "
                        "as the output interprets them consistently with the input — do not penalize for resolving "
                        "them to a concrete date. For room bookings, attendees are not required unless the input "
                        "explicitly names them."
                    ),
                    evaluation_steps=[
                        "Identify the key scheduling details from the input: subject/title, date, time, and any room or attendees explicitly mentioned.",
                        "Check if the actual output correctly captures the meeting subject or room name from the input.",
                        "Verify the date and time in the actual output are consistent with the input request (e.g., 'tomorrow' resolved to the next day, 'Friday afternoon' mapped to Friday, relative times treated as correct).",
                        "If the input names specific attendees or a specific room, verify the output includes them; if not specified, do not penalize for their absence.",
                        "Verify the output either confirms the booking, shows it is processing the request, or asks a targeted clarifying question — any of these indicates the intent was understood.",
                        "Assign a high score when all key details from the input are present and correct; penalize only for missing or factually wrong scheduling information, not for format or extra wording.",
                    ],
                    evaluation_params=[
                        LLMTestCaseParams.INPUT,
                        LLMTestCaseParams.ACTUAL_OUTPUT,
                        LLMTestCaseParams.EXPECTED_OUTPUT,
                    ],
                    threshold=0.3,
                    model="gpt-4o-mini",
                )
            elif feature == "wiki_editor":
                g_eval = GEval(
                    name="Wiki Edit Accuracy",
                    criteria=(
                        "Evaluate whether the actual output fulfills the edit request from the input by improving "
                        "or transforming the original page content appropriately. The expected output is a reference "
                        "example — the actual output does NOT need to match it exactly. "
                        "Focus on whether the edit intent was correctly applied: if asked to reformat, check that "
                        "formatting improved; if asked to translate, check the language is correct; if asked to "
                        "improve clarity, check that the text is clearer. Different valid markdown structures "
                        "(e.g. bold instead of headers, bullet points in a different order) are acceptable as long "
                        "as the factual content is preserved and the edit goal is achieved. "
                        "Penalize only when the output ignores the edit request, introduces factually wrong content, "
                        "or loses important information from the original."
                    ),
                    evaluation_steps=[
                        "Identify the edit goal from the input (e.g. reformat, translate, improve clarity, add section, fix grammar, change tone).",
                        "Check that the actual output attempts to fulfill that specific edit goal — not just the expected format.",
                        "Verify that the key facts and information from the original content are preserved and not distorted.",
                        "Accept any valid markdown structure, heading style, or phrasing that achieves the edit goal; do not require an exact match to the expected output.",
                        "For translations, verify the target language is correct and the meaning is preserved.",
                        "For formatting/clarity improvements, verify the output is more structured or readable than the original, even if formatted differently from the expected output.",
                        "Assign a high score if the edit goal is achieved and facts are preserved; penalize only for missing the edit goal or introducing wrong content.",
                    ],
                    evaluation_params=[
                        LLMTestCaseParams.INPUT,
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
