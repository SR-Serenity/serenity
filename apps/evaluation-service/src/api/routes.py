import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas import (
    AuthContextInput,
    CaseResult,
    DashboardSummary,
    DatasetImportRequest,
    DatasetListResponse,
    DatasetSummary,
    MetricAvg,
    MetricResult,
    RunListResponse,
    RunRequest,
    RunResultsResponse,
    RunSummary,
)
from src.evaluation.metrics import default_metrics_for_feature
from src.evaluation.runner import run_evaluation
from src.storage.database import DatasetRow, ResultRow, RunRow, async_session

router = APIRouter(prefix="/api/v1")


def _run_to_summary(run: RunRow) -> RunSummary:
    return RunSummary(
        id=run.id,
        dataset_id=run.dataset_id,
        dataset_name=run.dataset_name,
        feature=run.feature,
        metrics=run.metrics or [],
        status=run.status,
        started_at=run.started_at,
        finished_at=run.finished_at,
        total_cases=run.total_cases or 0,
        passed_cases=run.passed_cases or 0,
        error=run.error,
    )


DATASETS_DIR = Path(__file__).resolve().parents[2] / "datasets"


@router.post("/datasets/seed", response_model=DatasetListResponse)
async def seed_datasets():
    """Load all JSON files from the datasets/ folder into the DB (skips duplicates by name)."""
    async with async_session() as session:
        existing = (await session.execute(select(DatasetRow))).scalars().all()
        existing_names = {r.name for r in existing}

    added: list[DatasetRow] = []
    for path in sorted(DATASETS_DIR.glob("*.json")):
        data = json.loads(path.read_text())
        if data.get("name") in existing_names:
            continue
        row = DatasetRow(
            id=str(uuid4()),
            name=data["name"],
            feature=data["feature"],
            cases=data["cases"],
            created_at=datetime.now(UTC),
        )
        added.append(row)

    if added:
        async with async_session() as session:
            session.add_all(added)
            await session.commit()

    async with async_session() as session:
        all_rows = (await session.execute(select(DatasetRow))).scalars().all()

    return DatasetListResponse(
        datasets=[
            DatasetSummary(id=r.id, name=r.name, feature=r.feature, case_count=len(r.cases), created_at=r.created_at)
            for r in all_rows
        ]
    )


@router.get("/datasets", response_model=DatasetListResponse)
async def list_datasets():
    async with async_session() as session:
        rows = (await session.execute(select(DatasetRow))).scalars().all()
    datasets = [
        DatasetSummary(
            id=r.id,
            name=r.name,
            feature=r.feature,
            case_count=len(r.cases),
            created_at=r.created_at,
        )
        for r in rows
    ]
    return DatasetListResponse(datasets=datasets)


@router.post("/datasets/import", response_model=DatasetSummary)
async def import_dataset(payload: DatasetImportRequest):
    row = DatasetRow(
        id=str(uuid4()),
        name=payload.name,
        feature=payload.feature,
        cases=[c.model_dump() for c in payload.cases],
        created_at=datetime.now(UTC),
    )
    async with async_session() as session:
        session.add(row)
        await session.commit()
    return DatasetSummary(
        id=row.id,
        name=row.name,
        feature=row.feature,
        case_count=len(payload.cases),
        created_at=row.created_at,
    )


@router.get("/runs", response_model=RunListResponse)
async def list_runs():
    async with async_session() as session:
        rows = (
            await session.execute(select(RunRow).order_by(RunRow.started_at.desc()))
        ).scalars().all()
    return RunListResponse(runs=[_run_to_summary(r) for r in rows])


@router.post("/runs", response_model=RunSummary)
async def start_run(payload: RunRequest, background_tasks: BackgroundTasks):
    async with async_session() as session:
        dataset = await session.get(DatasetRow, payload.dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        metric_names = payload.metrics or default_metrics_for_feature(dataset.feature)
        run = RunRow(
            id=str(uuid4()),
            dataset_id=dataset.id,
            dataset_name=dataset.name,
            feature=dataset.feature,
            metrics=metric_names,
            status="pending",
            started_at=datetime.now(UTC),
            total_cases=0,
            passed_cases=0,
        )
        session.add(run)
        await session.commit()

    background_tasks.add_task(run_evaluation, run.id, payload.auth_context)
    return _run_to_summary(run)


@router.get("/runs/{run_id}", response_model=RunSummary)
async def get_run(run_id: str):
    async with async_session() as session:
        run = await session.get(RunRow, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
    return _run_to_summary(run)


@router.get("/runs/{run_id}/results", response_model=RunResultsResponse)
async def get_run_results(run_id: str):
    async with async_session() as session:
        run = await session.get(RunRow, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")

        result_rows = (
            await session.execute(
                select(ResultRow)
                .where(ResultRow.run_id == run_id)
                .order_by(ResultRow.case_index, ResultRow.metric_name)
            )
        ).scalars().all()

    # Group by case_index
    cases: dict[int, CaseResult] = {}
    for r in result_rows:
        if r.case_index not in cases:
            cases[r.case_index] = CaseResult(
                case_index=r.case_index,
                input=r.input,
                expected_output=r.expected_output,
                actual_output=r.actual_output,
                latency_ms=r.latency_ms,
                metrics=[],
            )
        cases[r.case_index].metrics.append(
            MetricResult(
                metric_name=r.metric_name,
                score=r.score,
                passed=bool(r.passed) if r.passed is not None else None,
                reason=r.reason,
            )
        )

    return RunResultsResponse(
        run=_run_to_summary(run),
        results=list(cases.values()),
    )


@router.get("/summary", response_model=DashboardSummary)
async def get_summary():
    async with async_session() as session:
        total_runs = (await session.execute(select(func.count(RunRow.id)))).scalar() or 0
        total_datasets = (await session.execute(select(func.count(DatasetRow.id)))).scalar() or 0

        recent_runs = (
            await session.execute(
                select(RunRow).order_by(RunRow.started_at.desc()).limit(5)
            )
        ).scalars().all()

        # Avg score per metric across completed runs
        metric_rows = (
            await session.execute(
                select(
                    ResultRow.metric_name,
                    func.avg(ResultRow.score).label("avg_score"),
                    func.avg(ResultRow.passed).label("pass_rate"),
                ).group_by(ResultRow.metric_name)
            )
        ).all()

    metric_avgs = [
        MetricAvg(
            metric_name=r.metric_name,
            avg_score=round(r.avg_score or 0, 3),
            pass_rate=round(r.pass_rate or 0, 3),
        )
        for r in metric_rows
    ]

    return DashboardSummary(
        total_runs=total_runs,
        total_datasets=total_datasets,
        recent_runs=[_run_to_summary(r) for r in recent_runs],
        metric_averages=metric_avgs,
    )
