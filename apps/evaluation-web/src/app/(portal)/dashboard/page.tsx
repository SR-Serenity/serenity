'use client'

import { useEffect, useState } from 'react'
import { evalApi } from '@/lib/api-client'
import type { DashboardSummary } from '@/lib/types'
import { RunStatusBadge } from '@/components/eval/RunStatusBadge'
import { MetricScoreBar } from '@/components/eval/MetricScoreBar'
import Link from 'next/link'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    evalApi.getSummary().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <PageError message={error} />
  if (!data) return <PageLoading />

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Runs" value={data.total_runs} />
        <StatCard label="Datasets" value={data.total_datasets} />
        <StatCard
          label="Last Run"
          value={data.recent_runs[0] ? new Date(data.recent_runs[0].started_at).toLocaleDateString() : '—'}
        />
      </div>

      {/* Metric averages */}
      {data.metric_averages.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Avg Scores (all runs)</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {data.metric_averages.map((m) => (
              <div key={m.metric_name} className="px-5 py-4 flex items-center gap-4">
                <span className="w-48 text-sm text-gray-700 capitalize">{m.metric_name.replace(/_/g, ' ')}</span>
                <MetricScoreBar score={m.avg_score} />
                <span className="ml-auto text-xs text-gray-400">{Math.round(m.pass_rate * 100)}% pass</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent runs */}
      {data.recent_runs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Recent Runs</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {data.recent_runs.map((run) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{run.dataset_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {run.metrics.map((m) => m.replace(/_/g, ' ')).join(', ')} · {new Date(run.started_at).toLocaleString()}
                  </p>
                </div>
                <RunStatusBadge status={run.status} />
                {run.status === 'completed' && (
                  <span className="text-sm font-medium text-gray-700">
                    {run.passed_cases}/{run.total_cases} passed
                  </span>
                )}
                {run.error && (
                  <span className="text-xs text-red-500 truncate max-w-32">{run.error}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function PageLoading() {
  return <div className="p-8 text-sm text-gray-500">Loading…</div>
}

function PageError({ message }: { message: string }) {
  return <div className="p-8 text-sm text-red-600">{message}</div>
}
