'use client'

import { useState } from 'react'
import { useNodes, useReactFlow } from '@xyflow/react'
import { X, ChevronDown, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BLOCK_SECTIONS, findBlock, sectionForKind } from './block-registry'
import type { BlockKind } from './block-registry'
import type { AutomationTriggerType, AutomationActionType, AutomationConditionType } from '@serenity/api'

type Conv   = { id: string; name: string | null }
type Member = { id: string; displayName: string | null }
type Dept   = { id: string; name: string }

function defaultConfig(kind: BlockKind, type: string): Record<string, unknown> {
  if (kind === 'trigger' && type === 'SCHEDULE')
    return { time: '09:00', days: ['MON', 'TUE', 'WED', 'THU', 'FRI'], cron: '0 9 * * 1,2,3,4,5' }
  if (kind === 'condition') {
    if (type === 'TIME_WINDOW')      return { startHour: 9, endHour: 18, days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] }
    if (type === 'TASK_PRIORITY_IS') return { priority: 'HIGH' }
  }
  return {}
}

interface Props {
  nodeId: string
  nodeKind: BlockKind
  initialNodeType?: string
  onClose: () => void
  conversations: Conv[]
  members: Member[]
  departments: Dept[]
}

export function NodePanel({ nodeId, nodeKind, initialNodeType, onClose, conversations, members, departments }: Props) {
  const nodes = useNodes()
  const { updateNodeData } = useReactFlow()
  const node   = nodes.find(n => n.id === nodeId)
  const data   = (node?.data ?? {}) as { nodeType?: string | null; config?: Record<string, unknown> }
  const config = data.config ?? {}

  // Use initialNodeType as fallback for the first render before useNodes() propagates
  const effectiveNodeType = data.nodeType ?? initialNodeType ?? null
  const [changingType, setChangingType] = useState(!effectiveNodeType)

  function applyType(type: string) {
    updateNodeData(nodeId, { nodeType: type, config: defaultConfig(nodeKind, type) })
    setChangingType(false)
  }

  function updateConfig(patch: Record<string, unknown>) {
    updateNodeData(nodeId, { ...data, config: { ...config, ...patch } })
  }

  const section    = sectionForKind(nodeKind)
  const currentDef = effectiveNodeType ? findBlock(effectiveNodeType) : null

  return (
    <div className="flex w-64 shrink-0 flex-col border-l border-slate-200 bg-white">
      {/* Header — identical structure to palette header */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="flex-1 text-[13px] font-semibold text-slate-800 capitalize">
          {nodeKind} settings
        </span>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Current type strip */}
      {!changingType && currentDef && (
        <div className={cn('flex items-center gap-2.5 border-b border-slate-100 px-3 py-2.5', section.accentBg)}>
          <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg text-white', currentDef.iconBg)}>
            <currentDef.Icon className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-slate-800">{currentDef.label}</p>
            <p className="truncate text-[10px] text-slate-400">{currentDef.description}</p>
          </div>
          <button
            onClick={() => setChangingType(true)}
            className="flex shrink-0 items-center gap-0.5 rounded px-1.5 py-1 text-[10px] font-medium text-slate-500 hover:bg-white hover:text-slate-700"
          >
            <RotateCcw className="size-2.5" />
            Change
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {changingType ? (
          <TypePicker nodeKind={nodeKind} onSelect={applyType} />
        ) : (
          <div className="space-y-4 p-4">
            {nodeKind === 'trigger' && (
              <TriggerConfig
                nodeType={effectiveNodeType as AutomationTriggerType}
                config={config}
                conversations={conversations}
                onChange={updateConfig}
              />
            )}
            {nodeKind === 'condition' && (
              <ConditionConfig
                nodeType={effectiveNodeType as AutomationConditionType}
                config={config}
                conversations={conversations}
                departments={departments}
                onChange={updateConfig}
              />
            )}
            {nodeKind === 'action' && (
              <ActionConfig
                nodeType={effectiveNodeType as AutomationActionType}
                config={config}
                conversations={conversations}
                members={members}
                onChange={updateConfig}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!changingType && (
        <div className="border-t border-slate-100 px-4 py-3">
          <button
            onClick={onClose}
            className="h-9 w-full rounded-lg bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}

// ── Type picker — same item cards as the palette ───────────────────────────────

function TypePicker({ nodeKind, onSelect }: { nodeKind: BlockKind; onSelect: (t: string) => void }) {
  const section = sectionForKind(nodeKind)
  const hints: Record<BlockKind, string> = {
    trigger:   'What starts this workflow?',
    condition: 'Which condition branches the flow?',
    action:    'What should happen next?',
  }

  // Show only the section for this kind
  const sections = BLOCK_SECTIONS.filter(s => s.kind === nodeKind)

  return (
    <div className="px-3 py-3">
      <p className="mb-3 text-[11px] text-slate-500">{hints[nodeKind]}</p>
      <p className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${section.accentText}`}>
        {section.title}
      </p>
      <div className="space-y-1.5">
        {sections.flatMap(s => s.items).map(item => (
          <button
            key={item.nodeType}
            onClick={() => onSelect(item.nodeType)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm"
          >
            <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg text-white', item.iconBg)}>
              <item.Icon className="size-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-slate-800">{item.label}</p>
              <p className="truncate text-[10px] text-slate-400">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Shared form helpers ────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[10px] text-slate-400">{hint}</p>}
    </div>
  )
}

const inputCls    = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100'
const textareaCls = 'w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100'

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-8 text-[12px] text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

// ── Trigger configs ────────────────────────────────────────────────────────────

function TriggerConfig({ nodeType, config, conversations, onChange }: {
  nodeType: AutomationTriggerType
  config: Record<string, unknown>
  conversations: Conv[]
  onChange: (p: Record<string, unknown>) => void
}) {
  if (nodeType === 'SCHEDULE')          return <ScheduleConfig config={config} onChange={onChange} />
  if (nodeType === 'MESSAGE_KEYWORD')   return <KeywordConfig config={config} conversations={conversations} onChange={onChange} />
  if (nodeType === 'TASK_STATUS_CHANGED') return (
    <Field label="Target status">
      <Select value={(config.status as string) ?? ''} onChange={v => onChange({ ...config, status: v || undefined })}>
        <option value="">Any status change</option>
        <option value="TODO">To Do</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="DONE">Done</option>
        <option value="CANCELLED">Cancelled</option>
      </Select>
    </Field>
  )
  return (
    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-[12px] text-slate-500">
      {nodeType === 'MEMBER_JOINED' && 'Fires when a new member joins. No configuration needed.'}
      {nodeType === 'TASK_CREATED'  && 'Fires when any task is created.'}
      {nodeType === 'TASK_ASSIGNED' && 'Fires when any task is assigned.'}
    </p>
  )
}

const DAY_TO_CRON: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 }

function buildScheduleCron(time: string, days: string[]): string {
  const [h, m] = time.split(':').map(Number)
  if (days.length === 0 || days.length === 7) return `${m} ${h} * * *`
  const cronDays = [...days].sort((a, b) => DAY_TO_CRON[a] - DAY_TO_CRON[b]).map(d => DAY_TO_CRON[d]).join(',')
  return `${m} ${h} * * ${cronDays}`
}

function ScheduleConfig({ config, onChange }: {
  config: Record<string, unknown>
  onChange: (p: Record<string, unknown>) => void
}) {
  const time = (config.time as string) ?? '09:00'
  const days = (config.days as string[] | undefined) ?? ['MON', 'TUE', 'WED', 'THU', 'FRI']

  function toggleDay(d: string) {
    const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d]
    onChange({ ...config, days: next, cron: buildScheduleCron(time, next) })
  }

  return (
    <>
      <Field label="Time">
        <input
          type="time"
          value={time}
          onChange={e => onChange({ ...config, time: e.target.value, cron: buildScheduleCron(e.target.value, days) })}
          className={inputCls}
        />
      </Field>
      <Field label="Days" hint="Leave all selected to run every day.">
        <div className="flex gap-1">
          {ALL_DAYS.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={cn(
                'flex h-8 flex-1 items-center justify-center rounded-lg text-[10px] font-bold transition',
                days.includes(day) ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200',
              )}
            >
              {DAY_LABEL[day]}
            </button>
          ))}
        </div>
      </Field>
    </>
  )
}

function KeywordConfig({ config, conversations, onChange }: {
  config: Record<string, unknown>
  conversations: Conv[]
  onChange: (p: Record<string, unknown>) => void
}) {
  const keywords   = (config.keywords as string[] | undefined)?.join(', ') ?? ''
  const channelIds = (config.channelIds as string[] | undefined) ?? []
  function toggleCh(id: string) {
    const next = channelIds.includes(id) ? channelIds.filter(c => c !== id) : [...channelIds, id]
    onChange({ ...config, channelIds: next })
  }
  return (
    <>
      <Field label="Keywords (comma-separated)" hint="Fires when any word appears in a message.">
        <input
          value={keywords}
          onChange={e => onChange({ ...config, keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })}
          placeholder="urgent, help, escalate"
          className={inputCls}
        />
      </Field>
      <Field label="Limit to channels" hint="Leave empty to match any channel.">
        <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-1">
          {conversations.length === 0 && <p className="px-2 py-1 text-[10px] text-slate-400">No channels found</p>}
          {conversations.map(c => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-white">
              <input type="checkbox" checked={channelIds.includes(c.id)} onChange={() => toggleCh(c.id)} className="size-3 accent-brand" />
              <span className="text-[11px] text-slate-700">#{c.name ?? c.id}</span>
            </label>
          ))}
        </div>
      </Field>
    </>
  )
}

// ── Condition configs ──────────────────────────────────────────────────────────

function ConditionConfig({ nodeType, config, conversations, departments, onChange }: {
  nodeType: AutomationConditionType
  config: Record<string, unknown>
  conversations: Conv[]
  departments: Dept[]
  onChange: (p: Record<string, unknown>) => void
}) {
  return (
    <>
      {nodeType === 'TIME_WINDOW'        && <TimeWindowConfig       config={config} onChange={onChange} />}
      {nodeType === 'CHANNEL_IS'         && <ChannelIsConfig        config={config} conversations={conversations} onChange={onChange} />}
      {nodeType === 'TASK_PRIORITY_IS'   && <TaskPriorityIsConfig   config={config} onChange={onChange} />}
      {nodeType === 'USER_IN_DEPARTMENT' && <UserInDepartmentConfig config={config} departments={departments} onChange={onChange} />}
    </>
  )
}

const ALL_DAYS  = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_LABEL: Record<string, string> = { MON: 'Mo', TUE: 'Tu', WED: 'We', THU: 'Th', FRI: 'Fr', SAT: 'Sa', SUN: 'Su' }

function TimeWindowConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const startHour = (config.startHour as number) ?? 9
  const endHour   = (config.endHour as number) ?? 18
  const days      = (config.days as string[]) ?? ['MON', 'TUE', 'WED', 'THU', 'FRI']
  function toggleDay(d: string) {
    const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d]
    onChange({ ...config, days: next })
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start hour">
          <input type="number" min={0} max={23} value={startHour}
            onChange={e => onChange({ ...config, startHour: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="End hour">
          <input type="number" min={1} max={24} value={endHour}
            onChange={e => onChange({ ...config, endHour: Number(e.target.value) })} className={inputCls} />
        </Field>
      </div>
      <Field label="Days of week">
        <div className="flex flex-wrap gap-1">
          {ALL_DAYS.map(day => (
            <button key={day} type="button" onClick={() => toggleDay(day)}
              className={cn(
                'flex size-8 items-center justify-center rounded-lg text-[11px] font-bold transition',
                days.includes(day) ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
              )}>
              {DAY_LABEL[day]}
            </button>
          ))}
        </div>
      </Field>
    </>
  )
}

function ChannelIsConfig({ config, conversations, onChange }: { config: Record<string, unknown>; conversations: Conv[]; onChange: (p: Record<string, unknown>) => void }) {
  const channelIds = (config.channelIds as string[] | undefined) ?? []
  function toggleCh(id: string) {
    const next = channelIds.includes(id) ? channelIds.filter(c => c !== id) : [...channelIds, id]
    onChange({ ...config, channelIds: next })
  }
  return (
    <Field label="Channels" hint="True if the event happened in any of these.">
      <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-1">
        {conversations.length === 0 && <p className="px-2 py-1 text-[10px] text-slate-400">No channels</p>}
        {conversations.map(c => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-white">
            <input type="checkbox" checked={channelIds.includes(c.id)} onChange={() => toggleCh(c.id)} className="size-3 accent-brand" />
            <span className="text-[11px] text-slate-700">#{c.name ?? c.id}</span>
          </label>
        ))}
      </div>
    </Field>
  )
}

function TaskPriorityIsConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <Field label="Priority">
      <Select value={(config.priority as string) ?? 'HIGH'} onChange={v => onChange({ ...config, priority: v })}>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </Select>
    </Field>
  )
}

function UserInDepartmentConfig({ config, departments, onChange }: { config: Record<string, unknown>; departments: Dept[]; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <Field label="Department" hint="True if the trigger user belongs to this dept.">
      <Select value={(config.departmentId as string) ?? ''} onChange={v => onChange({ ...config, departmentId: v || undefined })}>
        <option value="">Select a department…</option>
        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </Select>
    </Field>
  )
}

// ── Action configs ─────────────────────────────────────────────────────────────

function ActionConfig({ nodeType, config, conversations, members, onChange }: {
  nodeType: AutomationActionType
  config: Record<string, unknown>
  conversations: Conv[]
  members: Member[]
  onChange: (p: Record<string, unknown>) => void
}) {
  if (nodeType === 'AI_AGENT')     return <AiAgentConfig     config={config} conversations={conversations} onChange={onChange} />
  if (nodeType === 'NOTIFY')       return <NotifyConfig       config={config} members={members} onChange={onChange} />
  if (nodeType === 'CREATE_TASK')  return <CreateTaskConfig   config={config} members={members} onChange={onChange} />
  if (nodeType === 'POST_CHANNEL') return <PostChannelConfig  config={config} conversations={conversations} onChange={onChange} />
  return null
}

function AiAgentConfig({ config, conversations, onChange }: { config: Record<string, unknown>; conversations: Conv[]; onChange: (p: Record<string, unknown>) => void }) {
  const targetType   = (config.targetType as string) ?? 'CHANNEL'
  const useWebSearch = (config.useWebSearch as boolean) ?? false
  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div>
          <p className="text-[12px] font-semibold text-slate-700">Web search</p>
          <p className="text-[10px] text-slate-400">AI searches before generating</p>
        </div>
        <button type="button" onClick={() => onChange({ ...config, useWebSearch: !useWebSearch })}
          className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors', useWebSearch ? 'bg-blue-500' : 'bg-slate-300')}>
          <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition', useWebSearch ? 'translate-x-4' : 'translate-x-0')} />
        </button>
      </div>
      <Field label="Send to">
        <Select value={targetType} onChange={v => onChange({ ...config, targetType: v })}>
          <option value="CHANNEL">Post to channel</option>
          <option value="DM_TRIGGER_USER">DM the trigger user</option>
        </Select>
      </Field>
      {targetType === 'CHANNEL' && (
        <Field label="Channel">
          <Select value={(config.targetId as string) ?? ''} onChange={v => onChange({ ...config, targetId: v })}>
            <option value="">Select a channel…</option>
            {conversations.map(c => <option key={c.id} value={c.id}>{c.name ?? c.id}</option>)}
          </Select>
        </Field>
      )}
      <Field label="AI instruction" hint="Use {date}, {user.name}, {org.name} as variables.">
        <textarea
          value={(config.instruction as string) ?? ''}
          onChange={e => onChange({ ...config, instruction: e.target.value })}
          rows={4}
          placeholder={useWebSearch ? 'Search for latest news this week and summarize top 3 stories.' : 'Describe what the AI should write…'}
          className={textareaCls}
        />
      </Field>
    </>
  )
}

function NotifyConfig({ config, members, onChange }: { config: Record<string, unknown>; members: Member[]; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <Field label="Recipient">
        <Select value={(config.userId as string) ?? ''} onChange={v => onChange({ ...config, userId: v || undefined })}>
          <option value="">Trigger user (default)</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.displayName ?? m.id}</option>)}
        </Select>
      </Field>
      <Field label="Message">
        <textarea
          value={(config.message as string) ?? ''}
          onChange={e => onChange({ ...config, message: e.target.value })}
          rows={3}
          placeholder="Notification message…"
          className={textareaCls}
        />
      </Field>
    </>
  )
}

function CreateTaskConfig({ config, members, onChange }: { config: Record<string, unknown>; members: Member[]; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <Field label="Task title">
        <input
          value={(config.title as string) ?? ''}
          onChange={e => onChange({ ...config, title: e.target.value })}
          placeholder="e.g. Follow up on {task.title}"
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <Select value={(config.status as string) ?? 'TODO'} onChange={v => onChange({ ...config, status: v })}>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={(config.priority as string) ?? 'MEDIUM'} onChange={v => onChange({ ...config, priority: v })}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
        </Field>
      </div>
      <Field label="Assignee (optional)">
        <Select value={(config.assigneeId as string) ?? ''} onChange={v => onChange({ ...config, assigneeId: v || undefined })}>
          <option value="">Unassigned</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.displayName ?? m.id}</option>)}
        </Select>
      </Field>
    </>
  )
}

function PostChannelConfig({ config, conversations, onChange }: { config: Record<string, unknown>; conversations: Conv[]; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <Field label="Channel">
        <Select value={(config.channelId as string) ?? ''} onChange={v => onChange({ ...config, channelId: v })}>
          <option value="">Select a channel…</option>
          {conversations.map(c => <option key={c.id} value={c.id}>{c.name ?? c.id}</option>)}
        </Select>
      </Field>
      <Field label="Message" hint="Use {task.title}, {date} as variables.">
        <textarea
          value={(config.message as string) ?? ''}
          onChange={e => onChange({ ...config, message: e.target.value })}
          rows={3}
          placeholder="Message to post…"
          className={textareaCls}
        />
      </Field>
    </>
  )
}
