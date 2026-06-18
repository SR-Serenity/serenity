'use client'

import { Handle, Position, useReactFlow } from '@xyflow/react'
import { Clock, Hash, Flag, Users, Filter, Check, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AutomationConditionType } from '@serenity/api'

const CONDITION_META: Record<string, {
  label: string
  Icon: React.ComponentType<{ className?: string }>
  iconBg: string
}> = {
  TIME_WINDOW:        { label: 'Time window',          Icon: Clock,  iconBg: 'bg-amber-500' },
  CHANNEL_IS:         { label: 'Channel is',           Icon: Hash,   iconBg: 'bg-blue-500' },
  TASK_PRIORITY_IS:   { label: 'Task priority is',     Icon: Flag,   iconBg: 'bg-orange-500' },
  USER_IN_DEPARTMENT: { label: 'User in department',   Icon: Users,  iconBg: 'bg-green-500' },
}

const DAY_SHORT: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' }

function getSummary(nodeType: string, config: Record<string, unknown>): string {
  switch (nodeType) {
    case 'TIME_WINDOW': {
      const start = (config.startHour as number) ?? 0
      const end   = (config.endHour as number) ?? 24
      const days  = config.days as string[] | undefined
      const dayStr = days?.length ? days.map(d => DAY_SHORT[d] ?? d).join(', ') : 'Every day'
      return `${String(start).padStart(2, '0')}:00 – ${String(end).padStart(2, '0')}:00 · ${dayStr}`
    }
    case 'CHANNEL_IS': {
      const ids = config.channelIds as string[] | undefined
      return ids?.length ? `${ids.length} channel${ids.length > 1 ? 's' : ''} selected` : 'Any channel'
    }
    case 'TASK_PRIORITY_IS': return config.priority ? `Priority: ${config.priority}` : 'Any priority'
    case 'USER_IN_DEPARTMENT': return config.departmentId ? 'Department set' : 'No department set'
    default: return ''
  }
}

type ConditionNodeData = {
  nodeType?: AutomationConditionType | null
  config: Record<string, unknown>
}

export function ConditionNode({ id, data, selected }: { id: string; data: ConditionNodeData; selected?: boolean }) {
  const { deleteElements } = useReactFlow()
  const meta    = data.nodeType ? CONDITION_META[data.nodeType] : null
  const summary = data.nodeType ? getSummary(data.nodeType, data.config) : ''

  return (
    <div className={cn(
      'group relative w-64 cursor-pointer rounded-xl border-2 bg-white shadow-sm transition-all',
      selected ? 'border-amber-500 shadow-lg shadow-amber-100' : 'border-slate-200 hover:border-amber-300 hover:shadow-md',
      !data.nodeType && 'border-dashed',
    )}>
      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }) }}
        className="absolute -right-2 -top-2 z-10 flex size-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 opacity-0 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
      >
        <Trash2 className="size-3" />
      </button>

      <Handle type="target" position={Position.Top} className="!size-3 !border-2 !border-slate-300 !bg-white" />

      {/* Header */}
      <div className="flex items-center gap-2 rounded-t-[10px] bg-amber-50 px-3 py-2">
        <Filter className="size-3.5 text-amber-600" />
        <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">Condition</span>
      </div>

      {/* Body */}
      <div className="flex items-start gap-3 px-3 py-3">
        <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', meta ? `text-white ${meta.iconBg}` : 'bg-amber-50')}>
          {meta ? <meta.Icon className="size-4" /> : <Filter className="size-4 text-amber-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-900">{meta?.label ?? 'Choose a condition'}</p>
          {summary && <p className="mt-0.5 text-[11px] text-slate-500 truncate">{summary}</p>}
        </div>
      </div>

      {/* Branch labels */}
      <div className="flex items-center border-t border-slate-100">
        <div className="flex flex-1 items-center justify-center gap-1 py-1.5 text-[10px] font-semibold text-green-600">
          <Check className="size-3" /> Yes
        </div>
        <div className="h-3 w-px bg-slate-100" />
        <div className="flex flex-1 items-center justify-center gap-1 py-1.5 text-[10px] font-semibold text-red-400">
          <X className="size-3" /> No
        </div>
      </div>

      {/* Dual source handles */}
      <Handle type="source" id="true"  position={Position.Bottom} style={{ left: '25%' }}  className="!size-3 !border-2 !border-green-400 !bg-green-500" />
      <Handle type="source" id="false" position={Position.Bottom} style={{ left: '75%' }}  className="!size-3 !border-2 !border-red-400 !bg-red-400" />
    </div>
  )
}
