'use client'

import { Handle, Position, useReactFlow } from '@xyflow/react'
import { Sparkles, ChevronDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AutomationActionType } from '@serenity/api'

const ACTION_OPTIONS: { value: AutomationActionType; label: string; description: string; color: string }[] = [
  { value: 'AI_AGENT', label: 'AI Agent', description: 'Generate message with AI', color: 'purple' },
  { value: 'NOTIFY', label: 'Notify', description: 'Send a DM notification', color: 'green' },
  { value: 'CREATE_TASK', label: 'Create task', description: 'Create a new task', color: 'orange' },
  { value: 'POST_CHANNEL', label: 'Post to channel', description: 'Post a message to a channel', color: 'blue' },
]

const COLOR_MAP = {
  purple: { header: 'bg-purple-50', icon: 'bg-purple-500', label: 'text-purple-700', border: 'border-purple-500' },
  green: { header: 'bg-green-50', icon: 'bg-green-500', label: 'text-green-700', border: 'border-green-500' },
  orange: { header: 'bg-orange-50', icon: 'bg-orange-500', label: 'text-orange-700', border: 'border-orange-500' },
  blue: { header: 'bg-blue-50', icon: 'bg-blue-500', label: 'text-blue-700', border: 'border-blue-500' },
}

type ActionNodeData = {
  nodeType: AutomationActionType
  config: Record<string, unknown>
  conversations?: { id: string; name: string | null }[]
  members?: { id: string; displayName: string | null }[]
}

type Props = {
  id: string
  data: ActionNodeData
  selected?: boolean
}

export function ActionNode({ id, data, selected }: Props) {
  const { updateNodeData } = useReactFlow()

  const option = ACTION_OPTIONS.find(o => o.value === data.nodeType) ?? ACTION_OPTIONS[0]
  const colors = COLOR_MAP[option.color as keyof typeof COLOR_MAP]

  function update(patch: Partial<ActionNodeData>) {
    updateNodeData(id, { ...data, ...patch })
  }

  return (
    <div className={cn(
      'min-w-64 rounded-xl border-2 bg-white shadow-md transition-shadow',
      selected ? `${colors.border} shadow-md` : 'border-slate-200',
    )}>
      <Handle type="target" position={Position.Top} className="!size-3 !border-2 !border-slate-300 !bg-white" />

      {/* Header */}
      <div className={cn('flex items-center gap-2 rounded-t-[10px] px-4 py-2.5', colors.header)}>
        <div className={cn('flex size-6 items-center justify-center rounded-full text-white', colors.icon)}>
          <Sparkles className="size-3" />
        </div>
        <span className={cn('text-xs font-semibold uppercase tracking-wider', colors.label)}>Action</span>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Action type</label>
          <div className="relative">
            <select
              value={data.nodeType}
              onChange={e => update({ nodeType: e.target.value as AutomationActionType, config: {} })}
              className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {ACTION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label} — {o.description}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {data.nodeType === 'AI_AGENT' && (
          <AiAgentConfig config={data.config} conversations={data.conversations ?? []} onChange={config => update({ config })} />
        )}
        {data.nodeType === 'NOTIFY' && (
          <NotifyConfig config={data.config} members={data.members ?? []} onChange={config => update({ config })} />
        )}
        {data.nodeType === 'CREATE_TASK' && (
          <CreateTaskConfig config={data.config} members={data.members ?? []} onChange={config => update({ config })} />
        )}
        {data.nodeType === 'POST_CHANNEL' && (
          <PostChannelConfig config={data.config} conversations={data.conversations ?? []} onChange={config => update({ config })} />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!size-3 !border-2 !border-slate-300 !bg-white" />
    </div>
  )
}

function AiAgentConfig({ config, conversations, onChange }: {
  config: Record<string, unknown>
  conversations: { id: string; name: string | null }[]
  onChange: (c: Record<string, unknown>) => void
}) {
  const targetType = (config.targetType as string) ?? 'CHANNEL'
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Target</label>
        <select
          value={targetType}
          onChange={e => onChange({ ...config, targetType: e.target.value })}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="CHANNEL">Post to channel</option>
          <option value="DM_TRIGGER_USER">DM the trigger user</option>
        </select>
      </div>
      {targetType === 'CHANNEL' && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Channel</label>
          <div className="relative">
            <select
              value={(config.targetId as string) ?? ''}
              onChange={e => onChange({ ...config, targetId: e.target.value })}
              className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Select a channel…</option>
              {conversations.map(c => <option key={c.id} value={c.id}>{c.name ?? c.id}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">AI instruction</label>
        <textarea
          value={(config.instruction as string) ?? ''}
          onChange={e => onChange({ ...config, instruction: e.target.value })}
          rows={3}
          placeholder="Describe what the AI should write…"
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <p className="mt-1 text-xs text-slate-400">
          Use <code className="rounded bg-slate-100 px-1">{'{date}'}</code>{' '}
          <code className="rounded bg-slate-100 px-1">{'{user.name}'}</code>{' '}
          <code className="rounded bg-slate-100 px-1">{'{org.name}'}</code>
        </p>
      </div>
    </div>
  )
}

function NotifyConfig({ config, members, onChange }: {
  config: Record<string, unknown>
  members: { id: string; displayName: string | null }[]
  onChange: (c: Record<string, unknown>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Notify user (blank = trigger user)</label>
        <div className="relative">
          <select
            value={(config.userId as string) ?? ''}
            onChange={e => onChange({ ...config, userId: e.target.value || undefined })}
            className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Trigger user</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.displayName ?? m.id}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Message</label>
        <textarea
          value={(config.message as string) ?? ''}
          onChange={e => onChange({ ...config, message: e.target.value })}
          rows={2}
          placeholder="Notification message…"
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </div>
    </div>
  )
}

function CreateTaskConfig({ config, members, onChange }: {
  config: Record<string, unknown>
  members: { id: string; displayName: string | null }[]
  onChange: (c: Record<string, unknown>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Task title</label>
        <input
          value={(config.title as string) ?? ''}
          onChange={e => onChange({ ...config, title: e.target.value })}
          placeholder="e.g. Follow up on {task.title}"
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <select
            value={(config.status as string) ?? 'TODO'}
            onChange={e => onChange({ ...config, status: e.target.value })}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Priority</label>
          <select
            value={(config.priority as string) ?? 'MEDIUM'}
            onChange={e => onChange({ ...config, priority: e.target.value })}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Assignee (optional)</label>
        <div className="relative">
          <select
            value={(config.assigneeId as string) ?? ''}
            onChange={e => onChange({ ...config, assigneeId: e.target.value || undefined })}
            className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.displayName ?? m.id}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
    </div>
  )
}

function PostChannelConfig({ config, conversations, onChange }: {
  config: Record<string, unknown>
  conversations: { id: string; name: string | null }[]
  onChange: (c: Record<string, unknown>) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Channel</label>
        <div className="relative">
          <select
            value={(config.channelId as string) ?? ''}
            onChange={e => onChange({ ...config, channelId: e.target.value })}
            className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Select a channel…</option>
            {conversations.map(c => <option key={c.id} value={c.id}>{c.name ?? c.id}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Message</label>
        <textarea
          value={(config.message as string) ?? ''}
          onChange={e => onChange({ ...config, message: e.target.value })}
          rows={2}
          placeholder="Message to post… Use {task.title}, {date}"
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </div>
    </div>
  )
}

export function AddActionButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-500 transition hover:border-blue-400 hover:text-blue-600"
    >
      <Plus className="size-4" />
      Add action
    </button>
  )
}
