'use client'

import { Handle, Position, useReactFlow } from '@xyflow/react'
import { Zap, Clock, Users, MessageSquare, CheckSquare, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AutomationTriggerType } from '@serenity/api'

const TRIGGER_META: Record<string, {
  label: string
  Icon: React.ComponentType<{ className?: string }>
  iconBg: string
}> = {
  SCHEDULE:            { label: 'Schedule',              Icon: Clock,          iconBg: 'bg-blue-500' },
  MEMBER_JOINED:       { label: 'Member joins',          Icon: Users,          iconBg: 'bg-green-500' },
  MESSAGE_KEYWORD:     { label: 'Keyword in message',    Icon: MessageSquare,  iconBg: 'bg-orange-500' },
  TASK_CREATED:        { label: 'Task created',          Icon: CheckSquare,    iconBg: 'bg-purple-500' },
  TASK_STATUS_CHANGED: { label: 'Task status changes',   Icon: CheckSquare,    iconBg: 'bg-purple-500' },
  TASK_ASSIGNED:       { label: 'Task assigned',         Icon: CheckSquare,    iconBg: 'bg-purple-500' },
}

const STATUS_BADGE: Record<string, string> = {
  TODO:        'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE:        'bg-green-100 text-green-700',
  CANCELLED:   'bg-red-100 text-red-600',
}

function getSummary(nodeType: string, config: Record<string, unknown>): React.ReactNode {
  switch (nodeType) {
    case 'SCHEDULE': {
      const freq = config.frequency === 'weekly' ? 'Every Monday' : 'Every day'
      return `${freq} at ${(config.time as string) ?? '09:00'}`
    }
    case 'MESSAGE_KEYWORD': {
      const kws = config.keywords as string[] | undefined
      if (!kws?.length) return 'Any keyword'
      return (
        <div className="mt-1 flex flex-wrap gap-1">
          {kws.slice(0, 3).map(kw => (
            <span key={kw} className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">{kw}</span>
          ))}
          {kws.length > 3 && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">+{kws.length - 3}</span>}
        </div>
      )
    }
    case 'TASK_STATUS_CHANGED': {
      if (!config.status) return 'Any status change'
      const s = config.status as string
      return (
        <span className={cn('mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold', STATUS_BADGE[s] ?? STATUS_BADGE.TODO)}>
          → {s.replace('_', ' ')}
        </span>
      )
    }
    case 'MEMBER_JOINED':  return 'When someone joins'
    case 'TASK_CREATED':   return 'When any task is created'
    case 'TASK_ASSIGNED':  return 'When any task is assigned'
    default: return null
  }
}

type TriggerNodeData = {
  nodeType?: AutomationTriggerType | null
  config: Record<string, unknown>
}

export function TriggerNode({ id, data, selected }: { id: string; data: TriggerNodeData; selected?: boolean }) {
  const { deleteElements } = useReactFlow()
  const meta = data.nodeType ? TRIGGER_META[data.nodeType] : null

  return (
    <div className={cn(
      'group relative w-64 cursor-pointer rounded-xl border-2 bg-white shadow-sm transition-all',
      selected ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-slate-200 hover:border-blue-300 hover:shadow-md',
      !data.nodeType && 'border-dashed',
    )}>
      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }) }}
        className="absolute -right-2 -top-2 z-10 flex size-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 opacity-0 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
      >
        <Trash2 className="size-3" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 rounded-t-[10px] bg-blue-50 px-3 py-2">
        <Zap className="size-3.5 text-blue-600" />
        <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">Trigger</span>
      </div>

      {/* Body */}
      <div className="flex items-start gap-3 px-3 py-3">
        <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', meta ? `text-white ${meta.iconBg}` : 'bg-blue-50')}>
          {meta ? <meta.Icon className="size-4" /> : <Zap className="size-4 text-blue-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-900">
            {meta?.label ?? 'Choose a trigger'}
          </p>
          {data.nodeType && (
            <div className="mt-0.5 text-[11px] text-slate-500 leading-snug">
              {getSummary(data.nodeType, data.config)}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!size-3 !border-2 !border-blue-300 !bg-white" />
    </div>
  )
}
