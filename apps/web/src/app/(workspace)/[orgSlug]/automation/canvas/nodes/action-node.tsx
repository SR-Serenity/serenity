'use client'

import { Handle, Position, useReactFlow } from '@xyflow/react'
import { Sparkles, Bell, CheckSquare, Hash, Bot, ArrowRight, ArrowUp, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AutomationActionType } from '@serenity/api'

const ACTION_META: Record<string, {
  label: string
  Icon: React.ComponentType<{ className?: string }>
  iconBg: string
  headerBg: string
  headerText: string
  borderSelected: string
}> = {
  AI_AGENT:     { label: 'AI Agent',        Icon: Bot,         iconBg: 'bg-purple-500', headerBg: 'bg-purple-50',  headerText: 'text-purple-700', borderSelected: 'border-purple-500 shadow-purple-100' },
  NOTIFY:       { label: 'Notify user',     Icon: Bell,        iconBg: 'bg-green-500',  headerBg: 'bg-green-50',   headerText: 'text-green-700',  borderSelected: 'border-green-500 shadow-green-100' },
  CREATE_TASK:  { label: 'Create task',     Icon: CheckSquare, iconBg: 'bg-orange-500', headerBg: 'bg-orange-50',  headerText: 'text-orange-700', borderSelected: 'border-orange-500 shadow-orange-100' },
  POST_CHANNEL: { label: 'Post to channel', Icon: Hash,        iconBg: 'bg-blue-500',   headerBg: 'bg-blue-50',    headerText: 'text-blue-700',   borderSelected: 'border-blue-500 shadow-blue-100' },
}

const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   'text-red-600',
  MEDIUM: 'text-yellow-600',
  LOW:    'text-slate-500',
}

const STATUS_COLORS: Record<string, string> = {
  TODO:        'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE:        'bg-green-100 text-green-700',
  CANCELLED:   'bg-red-100 text-red-600',
}

type Conv   = { id: string; name: string | null }
type Member = { id: string; displayName: string | null }

function getDestination(nodeType: string, config: Record<string, unknown>, conversations: Conv[], members: Member[]): React.ReactNode | null {
  switch (nodeType) {
    case 'POST_CHANNEL': {
      const ch = conversations.find(c => c.id === config.channelId)
      if (!ch?.name) return null
      return <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700"><Hash className="size-2.5" />{ch.name}</span>
    }
    case 'AI_AGENT': {
      if (config.targetType === 'DM_TRIGGER_USER') return <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-1.5 py-0.5 text-[11px] font-semibold text-purple-700"><ArrowRight className="size-2.5" />DM trigger user</span>
      const ch = conversations.find(c => c.id === config.targetId)
      if (!ch?.name) return null
      return <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-1.5 py-0.5 text-[11px] font-semibold text-purple-700"><ArrowRight className="size-2.5" />#{ch.name}</span>
    }
    case 'NOTIFY': {
      const userId = config.userId as string | undefined
      if (!userId) return <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-1.5 py-0.5 text-[11px] font-semibold text-green-700"><ArrowRight className="size-2.5" />trigger user</span>
      const m = members.find(m => m.id === userId)
      return <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-1.5 py-0.5 text-[11px] font-semibold text-green-700"><ArrowRight className="size-2.5" />@{m?.displayName ?? userId}</span>
    }
    case 'CREATE_TASK': {
      const s = (config.status as string) ?? 'TODO'
      const p = (config.priority as string) ?? 'MEDIUM'
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', STATUS_COLORS[s] ?? STATUS_COLORS.TODO)}>{s.replace('_', ' ')}</span>
          <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold', PRIORITY_COLORS[p] ?? PRIORITY_COLORS.MEDIUM)}><ArrowUp className="size-2.5" />{p}</span>
        </span>
      )
    }
    default: return null
  }
}

function getPreview(nodeType: string, config: Record<string, unknown>): string {
  const truncate = (s: string, n = 60) => s.length > n ? s.slice(0, n) + '…' : s
  switch (nodeType) {
    case 'AI_AGENT':    return config.instruction ? (config.useWebSearch ? '🔍 ' : '') + truncate(config.instruction as string) : ''
    case 'NOTIFY':      return config.message ? truncate(config.message as string) : ''
    case 'CREATE_TASK': return config.title ? `"${truncate(config.title as string, 55)}"` : ''
    case 'POST_CHANNEL':return config.message ? truncate(config.message as string) : ''
    default: return ''
  }
}

type ActionNodeData = {
  nodeType?: AutomationActionType | null
  config: Record<string, unknown>
  conversations?: Conv[]
  members?: Member[]
}

export function ActionNode({ id, data, selected }: { id: string; data: ActionNodeData; selected?: boolean }) {
  const { deleteElements } = useReactFlow()
  const conversations = data.conversations ?? []
  const members       = data.members ?? []
  const meta          = data.nodeType ? ACTION_META[data.nodeType] : null
  const destination   = data.nodeType ? getDestination(data.nodeType, data.config, conversations, members) : null
  const preview       = data.nodeType ? getPreview(data.nodeType, data.config) : ''

  return (
    <div className={cn(
      'group relative w-64 cursor-pointer rounded-xl border-2 bg-white shadow-sm transition-all',
      selected
        ? meta ? `${meta.borderSelected} shadow-lg` : 'border-purple-400 shadow-lg shadow-purple-100'
        : 'border-slate-200 hover:shadow-md',
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
      <div className={cn('flex items-center gap-2 rounded-t-[10px] px-3 py-2', meta?.headerBg ?? 'bg-purple-50')}>
        <Sparkles className={cn('size-3.5', meta?.headerText ?? 'text-purple-600')} />
        <span className={cn('flex-1 text-[10px] font-bold uppercase tracking-wider', meta?.headerText ?? 'text-purple-700')}>Action</span>
      </div>

      {/* Body */}
      <div className="flex items-start gap-3 px-3 py-3">
        <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', meta ? `text-white ${meta.iconBg}` : 'bg-purple-50')}>
          {meta ? <meta.Icon className="size-4" /> : <Sparkles className="size-4 text-purple-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[13px] font-semibold text-slate-900">{meta?.label ?? 'Choose an action'}</p>
            {destination}
          </div>
          {preview && <p className="mt-1 text-[11px] leading-relaxed text-slate-400 line-clamp-2">{preview}</p>}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!size-3 !border-2 !border-slate-300 !bg-white" />
    </div>
  )
}
