'use client'

import { useEffect, useRef, useState } from 'react'
import { use } from 'react'
import { evalApi } from '@/lib/api-client'
import type { RunResultsResponse, CaseResult } from '@/lib/types'
import { RunStatusBadge } from '@/components/eval/RunStatusBadge'
import { MetricScoreBar } from '@/components/eval/MetricScoreBar'
import { ChevronDown, ChevronRight, BarChart3, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react'

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<RunResultsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const dataRef = useRef<RunResultsResponse | null>(null)
  dataRef.current = data

  useEffect(() => {
    const load = () =>
      evalApi.getRunResults(id).then(setData).catch((e) => setError(e.message))

    load().finally(() => setLoading(false))

    const interval = setInterval(() => {
      const status = dataRef.current?.run.status
      if (status === 'pending' || status === 'running') load()
    }, 4000)
    return () => clearInterval(interval)
  }, [id])

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading…</div>
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>
  if (!data) return null

  const { run, results } = data

  // Calculate average scores and pass rates for each metric
  const metricStats: Record<string, { total: number; sum: number; passed: number }> = {}
  results.forEach((res) => {
    res.metrics.forEach((m) => {
      if (m.metric_name === 'error') return
      if (m.score != null) {
        if (!metricStats[m.metric_name]) {
          metricStats[m.metric_name] = { total: 0, sum: 0, passed: 0 }
        }
        metricStats[m.metric_name].total += 1
        metricStats[m.metric_name].sum += m.score
        if (m.passed) {
          metricStats[m.metric_name].passed += 1
        }
      }
    })
  })

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">{run.dataset_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {run.metrics.map((m) => m.replace(/_/g, ' ')).join(', ')} · Started {new Date(run.started_at).toLocaleString()}
          </p>
        </div>
        <RunStatusBadge status={run.status} />
      </div>

      {run.status === 'running' || run.status === 'pending' ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-4 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Evaluation in progress</p>
              {run.error && <p className="text-xs text-blue-600 mt-0.5">{run.error}</p>}
            </div>
          </div>
          {/* Show partial results as they arrive */}
          {results.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{results.length} case{results.length !== 1 ? 's' : ''} completed so far</p>
              {results.map((c) => <CaseCard key={c.case_index} result={c} />)}
            </div>
          )}
        </div>
      ) : run.status === 'failed' ? (
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-sm text-red-700">
          {run.error ?? 'Evaluation failed'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard 
              label="Total Cases" 
              value={run.total_cases} 
              icon={<BarChart3 className="text-blue-500 w-5 h-5" />}
              bgColor="bg-blue-50/50"
            />
            <StatCard 
              label="Passed Cases" 
              value={run.passed_cases} 
              icon={<CheckCircle2 className="text-green-500 w-5 h-5" />}
              bgColor="bg-green-50/50"
            />
            <StatCard 
              label="Overall Pass Rate" 
              value={`${run.total_cases > 0 ? Math.round((run.passed_cases / run.total_cases) * 100) : 0}%`} 
              icon={<TrendingUp className="text-indigo-500 w-5 h-5" />}
              bgColor="bg-indigo-50/50"
            />
          </div>

          {Object.keys(metricStats).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200/80 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Metric Breakdown</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(metricStats).map(([name, stats]) => {
                  const avgScore = stats.total > 0 ? Math.round((stats.sum / stats.total) * 100) : 0
                  const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0
                  const label = name.replace(/_/g, ' ')
                  
                  // Color styling based on score
                  let colorClass = 'bg-red-500'
                  let textColorClass = 'text-red-700'
                  let bgColorClass = 'bg-red-50/40 border-red-100/60'
                  if (avgScore >= 70) {
                    colorClass = 'bg-green-500'
                    textColorClass = 'text-green-700'
                    bgColorClass = 'bg-green-50/40 border-green-100/60'
                  } else if (avgScore >= 40) {
                    colorClass = 'bg-amber-500'
                    textColorClass = 'text-amber-700'
                    bgColorClass = 'bg-amber-50/40 border-amber-100/60'
                  }

                  return (
                    <div 
                      key={name} 
                      className={`rounded-xl border p-4 space-y-3 transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${bgColorClass}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate" title={label}>
                          {label}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white shadow-sm border border-gray-100/80 shrink-0 ${textColorClass}`}>
                          {passRate}% pass
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold text-gray-900 tracking-tight">{avgScore}%</span>
                        <span className="text-[10px] text-gray-400 font-medium">avg score</span>
                      </div>
                      <div className="w-full bg-gray-200/60 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${avgScore}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {results.map((c) => (
              <CaseCard key={c.case_index} result={c} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CaseCard({ result }: { result: CaseResult }) {
  const [open, setOpen] = useState(false)
  const allPassed = result.metrics.every((m) => m.passed !== false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        <span className="text-xs text-gray-400 w-6">#{result.case_index + 1}</span>
        <span className="flex-1 text-sm text-gray-800 truncate">{result.input}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {allPassed ? 'pass' : 'fail'}
        </span>
        {result.latency_ms != null && (
          <span className="text-xs text-gray-400">{result.latency_ms}ms</span>
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 text-sm">
          {result.case_metadata?.page_title && (
            <Field label="Page Title" value={result.case_metadata.page_title} />
          )}
          {result.case_metadata?.page_content_markdown && (
            <Field label="Original Page Content" value={result.case_metadata.page_content_markdown} />
          )}
          {result.case_metadata?.conversation_context && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Conversation Context</p>
              <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1.5 max-h-48 overflow-y-auto border border-gray-100">
                {result.case_metadata.conversation_context.map((msg, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="font-semibold capitalize text-gray-600">{msg.role}: </span>
                    <span className="text-gray-700">{msg.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Field label="Input" value={result.input} />
          {result.expected_output && <Field label="Expected" value={result.expected_output} />}
          {result.actual_output && <Field label="Actual output" value={result.actual_output} />}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Metrics</p>
            {result.metrics.map((m) => (
              <div key={m.metric_name} className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="w-44 text-xs text-gray-600 capitalize">{m.metric_name.replace(/_/g, ' ')}</span>
                  {m.score != null ? <MetricScoreBar score={m.score} /> : <span className="text-xs text-gray-400">—</span>}
                  <span className={`text-xs font-medium ${m.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {m.score != null ? m.score.toFixed(2) : '—'}
                  </span>
                </div>
                {m.reason && <p className="text-xs text-gray-500 pl-44">{m.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2">{value}</p>
    </div>
  )
}

function StatCard({ label, value, icon, bgColor = 'bg-white' }: { label: string; value: string | number; icon?: React.ReactNode; bgColor?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 p-5 flex items-center justify-between transition-all duration-200 hover:shadow-sm ${bgColor}`}>
      <div className="space-y-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      </div>
      {icon && (
        <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100/60 flex items-center justify-center">
          {icon}
        </div>
      )}
    </div>
  )
}
