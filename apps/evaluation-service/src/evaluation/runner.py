import asyncio
import os
import traceback
from datetime import UTC, datetime
from uuid import uuid4

from deepeval import evaluate
from deepeval.evaluate.configs import DisplayConfig
from deepeval.test_case import LLMTestCase
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas import AuthContextInput
from src.evaluation.metrics import build_metrics, default_metrics_for_feature
from src.services.ai_adapter import call_ai_chat
from src.storage.database import DatasetRow, ResultRow, RunRow, async_session


async def run_evaluation(run_id: str, auth_context: AuthContextInput) -> None:
    try:
        await _run(run_id, auth_context)
    except Exception as e:
        err = traceback.format_exc()
        async with async_session() as session:
            run = await session.get(RunRow, run_id)
            if run:
                run.status = "failed"
                run.error = str(e)
                run.finished_at = datetime.now(UTC)
                await session.commit()


async def _run(run_id: str, auth_context: AuthContextInput) -> None:
    from src.core.config import settings

    if settings.OPENAI_API_KEY:
        os.environ.setdefault("OPENAI_API_KEY", settings.OPENAI_API_KEY)

    async with async_session() as session:
        run = await session.get(RunRow, run_id)
        if not run:
            return
        dataset = await session.get(DatasetRow, run.dataset_id)
        if not dataset:
            run.status = "failed"
            run.error = "Dataset not found"
            run.finished_at = datetime.now(UTC)
            await session.commit()
            return

        run.status = "running"
        run.total_cases = len(dataset.cases)
        await session.commit()

    cases_data: list[dict] = dataset.cases
    metric_names: list[str] = run.metrics or default_metrics_for_feature(run.feature)

    passed_cases = 0

    for i, case in enumerate(cases_data):
        # Update progress on the run row
        async with async_session() as session:
            run = await session.get(RunRow, run_id)
            if run:
                run.error = f"Processing case {i + 1}/{len(cases_data)}…"
                await session.commit()

        # Call AI service
        actual_output = ""
        latency_ms = 0
        ai_error: str | None = None
        try:
            actual_output, latency_ms = await call_ai_chat(
                user_input=case["input"],
                auth_context=auth_context,
                feature=run.feature,
                case=case,
                session_id=f"eval-{run_id}-{i}",
            )
        except Exception as e:
            ai_error = str(e)
            actual_output = f"[AI ERROR: {e}]"

        # Build test case and run metrics
        test_case = LLMTestCase(
            input=case["input"],
            actual_output=actual_output,
            expected_output=case.get("expected_output"),
            retrieval_context=case.get("retrieval_context") or None,
        )

        metrics = build_metrics(metric_names, feature=run.feature)

        try:
            loop = asyncio.get_event_loop()
            eval_result = await loop.run_in_executor(
                None,
                lambda tc=test_case, m=metrics: evaluate(
                    test_cases=[tc],
                    metrics=m,
                    display_config=DisplayConfig(print_results=False, show_indicator=False),
                ),
            )
            metric_data_list = eval_result.test_results[0].metrics_data if eval_result.test_results else []
            case_passed = all(m.success for m in metric_data_list if m.success is not None)
        except Exception as e:
            metric_data_list = []
            case_passed = False
            ai_error = ai_error or str(e)

        if case_passed:
            passed_cases += 1

        # Populate case metadata for display
        metadata_dict = {}
        if "page_title" in case:
            metadata_dict["page_title"] = case["page_title"]
        if "page_content_markdown" in case:
            metadata_dict["page_content_markdown"] = case["page_content_markdown"]
        if "conversation_context" in case:
            metadata_dict["conversation_context"] = case["conversation_context"]

        # Write results for this case immediately
        async with async_session() as session:
            if metric_data_list:
                for md in metric_data_list:
                    session.add(ResultRow(
                        id=str(uuid4()),
                        run_id=run_id,
                        case_index=i,
                        input=case["input"],
                        expected_output=case.get("expected_output"),
                        actual_output=actual_output,
                        latency_ms=latency_ms,
                        metric_name=md.name,
                        score=md.score,
                        passed=1 if md.success else 0,
                        reason=md.reason,
                        case_metadata=metadata_dict if metadata_dict else None,
                    ))
            else:
                # Record failure row so the case appears in results
                session.add(ResultRow(
                    id=str(uuid4()),
                    run_id=run_id,
                    case_index=i,
                    input=case["input"],
                    expected_output=case.get("expected_output"),
                    actual_output=actual_output,
                    latency_ms=latency_ms,
                    metric_name="error",
                    score=0.0,
                    passed=0,
                    reason=ai_error or "Evaluation failed",
                    case_metadata=metadata_dict if metadata_dict else None,
                ))

            run = await session.get(RunRow, run_id)
            if run:
                run.passed_cases = passed_cases
            await session.commit()

    # Mark completed
    async with async_session() as session:
        run = await session.get(RunRow, run_id)
        if run:
            run.status = "completed"
            run.error = None
            run.finished_at = datetime.now(UTC)
            run.total_cases = len(cases_data)
            run.passed_cases = passed_cases
            await session.commit()
