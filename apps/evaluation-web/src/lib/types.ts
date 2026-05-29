export type Feature = 'workspace_qa' | 'task_creator' | 'meeting_scheduler' | 'document_understanding'
export type MetricName = 'answer_relevancy' | 'faithfulness' | 'contextual_recall' | 'extraction_accuracy'
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface DatasetCase {
  input: string
  expected_output: string
  retrieval_context: string[]
}

export interface DatasetSummary {
  id: string
  name: string
  feature: Feature
  case_count: number
  created_at: string
}

export interface DatasetImportRequest {
  name: string
  feature: Feature
  cases: DatasetCase[]
}

export interface AuthContextInput {
  org_id: string
  user_id: string
  org_slug: string
  role?: string
  display_name?: string
  email?: string
  org_name?: string
}

export interface RunRequest {
  dataset_id: string
  auth_context: AuthContextInput
  metrics?: MetricName[]
}

export interface RunSummary {
  id: string
  dataset_id: string
  dataset_name: string
  feature: Feature
  metrics: string[]
  status: RunStatus
  started_at: string
  finished_at?: string
  total_cases: number
  passed_cases: number
  error?: string
}

export interface MetricResult {
  metric_name: string
  score: number | null
  passed: boolean | null
  reason: string | null
}

export interface CaseResult {
  case_index: number
  input: string
  expected_output: string | null
  actual_output: string | null
  latency_ms: number | null
  metrics: MetricResult[]
}

export interface RunResultsResponse {
  run: RunSummary
  results: CaseResult[]
}

export interface MetricAvg {
  metric_name: string
  avg_score: number
  pass_rate: number
}

export interface DashboardSummary {
  total_runs: number
  total_datasets: number
  recent_runs: RunSummary[]
  metric_averages: MetricAvg[]
}

// Auth (mirrors Serenity auth-service response)
export interface OrgSummary {
  id: string
  name: string
  slug: string
}

export interface EvalUser {
  id: string
  email: string
  displayName: string
}

export interface AuthSession {
  token: string
  user: EvalUser
  org: OrgSummary
}
