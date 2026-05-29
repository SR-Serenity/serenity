from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class DatasetCase(BaseModel):
    input: str
    expected_output: str
    retrieval_context: list[str] = Field(default_factory=list)
    page_title: str | None = None
    page_content_markdown: str | None = None
    conversation_context: list[dict[str, Any]] | None = None


class DatasetImportRequest(BaseModel):
    name: str
    feature: Literal["workspace_qa", "task_creator", "meeting_scheduler", "document_understanding", "wiki_editor", "chat_assistant"]
    cases: list[DatasetCase]


class DatasetSummary(BaseModel):
    id: str
    name: str
    feature: str
    case_count: int
    created_at: datetime


class DatasetListResponse(BaseModel):
    datasets: list[DatasetSummary]


class AuthContextInput(BaseModel):
    org_id: str
    user_id: str
    org_slug: str
    role: str = "member"
    display_name: str | None = None
    email: str | None = None
    org_name: str | None = None
    auth_token: str | None = None


MetricName = Literal["answer_relevancy", "faithfulness", "contextual_recall", "extraction_accuracy"]


class RunRequest(BaseModel):
    dataset_id: str
    auth_context: AuthContextInput
    metrics: list[MetricName] | None = None  # None = auto-select by feature


class RunSummary(BaseModel):
    id: str
    dataset_id: str
    dataset_name: str
    feature: str
    metrics: list[str]
    status: str
    started_at: datetime
    finished_at: datetime | None = None
    total_cases: int
    passed_cases: int
    error: str | None = None


class RunListResponse(BaseModel):
    runs: list[RunSummary]


class MetricResult(BaseModel):
    metric_name: str
    score: float | None
    passed: bool | None
    reason: str | None


class CaseResult(BaseModel):
    case_index: int
    input: str
    expected_output: str | None
    actual_output: str | None
    latency_ms: int | None
    metrics: list[MetricResult]
    case_metadata: dict[str, Any] | None = None


class RunResultsResponse(BaseModel):
    run: RunSummary
    results: list[CaseResult]


class MetricAvg(BaseModel):
    metric_name: str
    avg_score: float
    pass_rate: float


class DashboardSummary(BaseModel):
    total_runs: int
    total_datasets: int
    recent_runs: list[RunSummary]
    metric_averages: list[MetricAvg]
