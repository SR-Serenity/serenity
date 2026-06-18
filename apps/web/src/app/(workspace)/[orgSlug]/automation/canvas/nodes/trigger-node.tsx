'use client'

import { Handle, Position, useReactFlow } from '@xyflow/react'
import { Play, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AutomationTriggerType } from '@serenity/api'

const TRIGGER_OPTIONS: { value: AutomationTriggerType; label: string; description: string }[] = [
  { value: 'SCHEDULE', label: 'Schedule', description: 'Runs at a set time' },
  { value: 'MEMBER_JOINED', label: 'Member joins', description: 'When someone joins workspace' },
  { value: 'MESSAGE_KEYWORD', label: 'Keyword match', description: 'When message contains keyword' },
  { value: 'TASK_CREATED', label: 'Task created', description: 'When a new task is created' },
  { value: 'TASK_STATUS_CHANGED', label: 'Task status changed', description: 'When a task status changes' },
  { value: 'TASK_ASSIGNED', label: 'Task assigned', description: 'When a task is assigned' },
]

type TriggerNodeData = {
  nodeType: AutomationTriggerType
  config: Record<string, unknown>
}

type Props = {
  id: string
  data: TriggerNodeData
  selected?: boolean
}

export function TriggerNode({ id, data, selected }: Props) {
  const { updateNodeData } = useReactFlow()

  const option = TRIGGER_OPTIONS.find(o => o.value === data.nodeType) ?? TRIGGER_OPTIONS[0]

  function update(patch: Partial<TriggerNodeData>) {
    updateNodeData(id, { ...data, ...patch })
  }

  return (
    <div className={cn(
      'min-w-64 rounded-xl border-2 bg-white shadow-md transition-shadow',
      selected ? 'border-blue-500 shadow-blue-100' : 'border-slate-200',
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 rounded-t-[10px] bg-blue-50 px-4 py-2.5">
        <div className="flex size-6 items-center justify-center rounded-full bg-blue-500 text-white">
          <Play className="size-3 fill-white" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Trigger</span>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        {/* Trigger type selector */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Event</label>
          <div className="relative">
            <select
              value={data.nodeType}
              onChange={e => update({ nodeType: e.target.value as AutomationTriggerType, config: {} })}
              className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {TRIGGER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label} — {o.description}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Config fields per trigger type */}
        {data.nodeType === 'SCHEDULE' && (
          <ScheduleConfig config={data.config} onChange={config => update({ config })} />
        )}
        {data.nodeType === 'MESSAGE_KEYWORD' && (
          <KeywordConfig config={data.config} onChange={config => update({ config })} />
        )}
        {data.nodeType === 'TASK_STATUS_CHANGED' && (
          <TaskStatusConfig config={data.config} onChange={config => update({ config })} />
        )}
        {(data.nodeType === 'MEMBER_JOINED' || data.nodeType === 'TASK_CREATED' || data.nodeType === 'TASK_ASSIGNED') && (
          <p className="text-xs text-slate-500">{option.description}.</p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!size-3 !border-2 !border-blue-400 !bg-white" />
    </div>
  )
}

function ScheduleConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const frequency = (config.frequency as string) ?? 'daily'
  const time = (config.time as string) ?? '09:00'

  function buildCron(freq: string, t: string) {
    const [h, m] = t.split(':').map(Number)
    return freq === 'weekly' ? `${m} ${h} * * 1` : `${m} ${h} * * *`
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Frequency</label>
        <select
          value={frequency}
          onChange={e => onChange({ ...config, frequency: e.target.value, cron: buildCron(e.target.value, time) })}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="daily">Every day</option>
          <option value="weekly">Every Monday</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Time</label>
        <input
          type="time"
          value={time}
          onChange={e => onChange({ ...config, time: e.target.value, cron: buildCron(frequency, e.target.value) })}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
        />
      </div>
    </div>
  )
}

function KeywordConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const keywords = (config.keywords as string[] | undefined)?.join(', ') ?? ''
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">Keywords (comma-separated)</label>
      <input
        value={keywords}
        onChange={e => onChange({ ...config, keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })}
        placeholder="urgent, help, question"
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  )
}

function TaskStatusConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">Status (leave blank for any)</label>
      <select
        value={(config.status as string) ?? ''}
        onChange={e => onChange({ ...config, status: e.target.value || undefined })}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
      >
        <option value="">Any status</option>
        <option value="TODO">To Do</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="DONE">Done</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
    </div>
  )
}
