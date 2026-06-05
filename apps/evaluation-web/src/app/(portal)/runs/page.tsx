'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { evalApi } from '@/lib/api-client'
import type { RunSummary } from '@/lib/types'
import { RunStatusBadge } from '@/components/eval/RunStatusBadge'
import { RefreshCw } from 'lucide-react'

export default function RunsPage() {
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const runsRef = useRef<RunSummary[]>([])
  runsRef.current = runs

  const load = async () => {
    const data = await evalApi.listRuns()
    setRuns(data)
    return data
  }

  useEffect(() => {
    load().finally(() => setLoading(false))

    // Poll every 4s — use ref to avoid stale closure
    const interval = setInterval(() => {
      const active = runsRef.current.some(
        (r) => r.status === 'pending' || r.status === 'running',
      )
      if (active) load()
    }, 4000)

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRefresh() {
    setRefreshing(true)
    await load().finally(() => setRefreshing(false))
  }

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading…</div>

  const hasActive = runs.some((r) => r.status === 'pending' || r.status === 'running')

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Runs</h1>
          {hasActive && (
            <p className="text-xs text-blue-600 mt-0.5 animate-pulse">Evaluation in progress…</p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-8 py-12 text-center">
          <p className="text-sm text-gray-500">No runs yet. Go to Datasets and click Run.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/runs/${run.id}`}
              className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{run.dataset_name}</p>
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
      )}
    </div>
  )
}
