import type {
  DashboardSummary,
  DatasetImportRequest,
  DatasetSummary,
  RunRequest,
  RunResultsResponse,
  RunSummary,
} from './types'

const BASE = process.env.NEXT_PUBLIC_EVAL_SERVICE_URL ?? 'http://localhost:8002'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API error ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export const evalApi = {
  // Datasets
  listDatasets: () =>
    request<{ datasets: DatasetSummary[] }>('/api/v1/datasets').then((r) => r.datasets),

  importDataset: (payload: DatasetImportRequest) =>
    request<DatasetSummary>('/api/v1/datasets/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Runs
  listRuns: () =>
    request<{ runs: RunSummary[] }>('/api/v1/runs').then((r) => r.runs),

  startRun: (payload: RunRequest) =>
    request<RunSummary>('/api/v1/runs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRun: (id: string) => request<RunSummary>(`/api/v1/runs/${id}`),

  getRunResults: (id: string) => request<RunResultsResponse>(`/api/v1/runs/${id}/results`),

  // Dashboard
  getSummary: () => request<DashboardSummary>('/api/v1/summary'),
}

// Auth API — calls Serenity auth-service directly
const AUTH_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:2991'

export async function loginToSerenity(
  email: string,
  password: string,
  orgSlug?: string,
): Promise<{ accessToken: string; organization?: { id: string; name: string; slug: string } }> {
  const res = await fetch(`${AUTH_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, orgSlug }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Login failed')
  }
  return res.json()
}
