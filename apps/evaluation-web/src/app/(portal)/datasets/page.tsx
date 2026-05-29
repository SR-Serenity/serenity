'use client'

import { useEffect, useState } from 'react'
import { evalApi } from '@/lib/api-client'
import type { DatasetSummary } from '@/lib/types'
import { StartRunDialog } from '@/components/eval/StartRunDialog'
import { Database, PlayCircle, Upload, RefreshCw } from 'lucide-react'

const FEATURE_LABELS: Record<string, string> = {
  workspace_qa: 'Workspace QA',
  task_creator: 'Task Creator',
  meeting_scheduler: 'Meeting Scheduler',
  document_understanding: 'Document Understanding',
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [selected, setSelected] = useState<DatasetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  const load = () => evalApi.listDatasets().then(setDatasets)

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  async function handleSeed() {
    setSeeding(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_EVAL_SERVICE_URL ?? 'http://localhost:8002'}/api/v1/datasets/seed`, { method: 'POST' })
      await load()
    } finally {
      setSeeding(false)
    }
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const data = JSON.parse(text)
    await evalApi.importDataset(data)
    await load()
    e.target.value = ''
  }

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading…</div>

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Datasets</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} className={seeding ? 'animate-spin' : ''} />
            Seed samples
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
            <Upload size={13} />
            Import JSON
            <input type="file" accept=".json" className="hidden" onChange={handleFileImport} />
          </label>
        </div>
      </div>

      {datasets.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {datasets.map((d) => (
            <div key={d.id} className="px-5 py-4 flex items-center gap-4">
              <Database size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{d.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {FEATURE_LABELS[d.feature] ?? d.feature} · {d.case_count} cases · {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelected(d)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
              >
                <PlayCircle size={13} />
                Run
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <StartRunDialog
          dataset={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-8 py-12 text-center">
      <Database size={32} className="mx-auto text-gray-300 mb-3" />
      <p className="text-sm text-gray-500">No datasets yet.</p>
      <p className="text-xs text-gray-400 mt-1">Import a dataset via the API or seed from the evaluation-service.</p>
    </div>
  )
}
