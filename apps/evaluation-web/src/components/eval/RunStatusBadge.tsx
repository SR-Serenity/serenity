import type { RunStatus } from '@/lib/types'

const config: Record<RunStatus, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-gray-100 text-gray-600' },
  running: { label: 'Running…', classes: 'bg-blue-100 text-blue-700 animate-pulse' },
  completed: { label: 'Completed', classes: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', classes: 'bg-red-100 text-red-700' },
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const { label, classes } = config[status] ?? config.pending
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${classes}`}>
      {label}
    </span>
  )
}
