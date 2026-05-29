'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { evalApi } from '@/lib/api-client'
import { useAuthStore } from '@/lib/auth-store'
import type { DatasetSummary, MetricName } from '@/lib/types'
import { X } from 'lucide-react'

const ALL_METRICS: { id: MetricName; label: string }[] = [
  { id: 'answer_relevancy', label: 'Answer Relevancy' },
  { id: 'faithfulness', label: 'Faithfulness' },
  { id: 'contextual_recall', label: 'Contextual Recall' },
  { id: 'extraction_accuracy', label: 'Extraction Accuracy' },
]

interface Props {
  dataset: DatasetSummary
  onClose: () => void
}

export function StartRunDialog({ dataset, onClose }: Props) {
  const session = useAuthStore((s) => s.session)
  const [metrics, setMetrics] = useState<MetricName[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function toggle(id: MetricName) {
    setMetrics((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id])
  }

  async function handleStart() {
    if (!session) return
    setLoading(true)
    setError('')
    try {
      const run = await evalApi.startRun({
        dataset_id: dataset.id,
        auth_context: {
          org_id: session.org.id,
          user_id: session.user.id,
          org_slug: session.org.slug,
          display_name: session.user.displayName,
          email: session.user.email,
          org_name: session.org.name,
        },
        metrics: metrics.length > 0 ? metrics : undefined,
      })
      onClose()
      router.push(`/runs/${run.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start run')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Start Evaluation Run</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div>
          <p className="text-sm text-gray-600">{dataset.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{dataset.case_count} test cases</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Metrics (leave empty = auto by feature)
          </p>
          {ALL_METRICS.map((m) => (
            <label key={m.id} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={metrics.includes(m.id)}
                onChange={() => toggle(m.id)}
                className="rounded border-gray-300 text-brand focus:ring-brand"
              />
              <span className="text-sm text-gray-700">{m.label}</span>
            </label>
          ))}
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full rounded-lg bg-brand text-white text-sm font-medium py-2.5 hover:bg-brand-hover disabled:opacity-50 transition-colors"
        >
          {loading ? 'Starting…' : 'Start Run'}
        </button>
      </div>
    </div>
  )
}
