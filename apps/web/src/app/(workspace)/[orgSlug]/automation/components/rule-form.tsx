'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, Loader2, Play, Sparkles, SlidersHorizontal, ChevronUp } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import type { AutomationRule, AutomationTriggerType, CreateAutomationRuleInput } from '@serenity/api'
import { useChatStore } from '@/stores/chat-store'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/app/shared/components/ui/button'
import type { TemplatePreset } from './templates'

type FormState = {
  name: string
  triggerType: AutomationTriggerType
  cronFrequency: 'daily' | 'weekly'
  cronTime: string
  keywords: string
  instruction: string
  targetType: 'CHANNEL' | 'DM_TRIGGER_USER'
  targetChannelId: string
}

function getDefaultForm(preset?: TemplatePreset): FormState {
  if (preset && preset.id !== 'BLANK') {
    return {
      name: preset.defaultName,
      triggerType: preset.triggerType,
      cronFrequency: preset.cronFrequency ?? 'daily',
      cronTime: preset.cronTime ?? '09:00',
      keywords: preset.keywords ?? '',
      instruction: preset.instruction,
      targetType: preset.targetType,
      targetChannelId: '',
    }
  }
  return {
    name: '',
    triggerType: 'SCHEDULE',
    cronFrequency: 'daily',
    cronTime: '09:00',
    keywords: '',
    instruction: '',
    targetType: 'CHANNEL',
    targetChannelId: '',
  }
}

function buildCron(frequency: 'daily' | 'weekly', time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  if (frequency === 'weekly') return `${minutes} ${hours} * * 1`
  return `${minutes} ${hours} * * *`
}

function formToInput(form: FormState): CreateAutomationRuleInput {
  const triggerConfig: Record<string, unknown> = {}
  if (form.triggerType === 'SCHEDULE') {
    triggerConfig.cron = buildCron(form.cronFrequency, form.cronTime)
  } else if (form.triggerType === 'MESSAGE_KEYWORD') {
    triggerConfig.keywords = form.keywords.split(',').map(k => k.trim()).filter(Boolean)
  }

  const actionConfig: Record<string, unknown> = {
    instruction: form.instruction,
    targetType: form.targetType,
  }
  if (form.targetType === 'CHANNEL') {
    actionConfig.targetId = form.targetChannelId
  }

  return {
    name: form.name.trim(),
    triggerType: form.triggerType,
    triggerConfig,
    actionType: 'AI_AGENT',
    actionConfig,
  }
}

function ruleToForm(rule: AutomationRule): FormState {
  const tc = rule.triggerConfig as Record<string, unknown>
  const ac = rule.actionConfig as Record<string, unknown>

  let cronFrequency: 'daily' | 'weekly' = 'daily'
  let cronTime = '09:00'
  if (tc.cron && typeof tc.cron === 'string') {
    const parts = tc.cron.split(' ')
    const min = parts[0] ?? '0'
    const hr = parts[1] ?? '9'
    cronTime = `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    if (tc.cron.includes('* * 1')) cronFrequency = 'weekly'
  }

  return {
    name: rule.name,
    triggerType: rule.triggerType,
    cronFrequency,
    cronTime,
    keywords: Array.isArray(tc.keywords) ? (tc.keywords as string[]).join(', ') : '',
    instruction: typeof ac.instruction === 'string' ? ac.instruction : '',
    targetType: (ac.targetType as 'CHANNEL' | 'DM_TRIGGER_USER') ?? 'CHANNEL',
    targetChannelId: typeof ac.targetId === 'string' ? ac.targetId : '',
  }
}

function triggerLabel(form: FormState): string {
  if (form.triggerType === 'MEMBER_JOINED') return 'When a member joins the workspace'
  if (form.triggerType === 'MESSAGE_KEYWORD') return 'When a message contains a keyword'
  const freq = form.cronFrequency === 'weekly' ? 'Every Monday' : 'Every day'
  const [h, m] = form.cronTime.split(':')
  const date = new Date()
  date.setHours(Number(h), Number(m))
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${freq} at ${time}`
}

function actionLabel(form: FormState, channelName?: string): string {
  if (form.targetType === 'DM_TRIGGER_USER') return 'Send AI message via DM to new member'
  if (channelName) return `Send AI message to #${channelName}`
  return 'Send AI message to a channel'
}

type StepId = 'trigger' | 'action'

type Props = {
  templatePreset?: TemplatePreset
  initialRule?: AutomationRule
  saving: boolean
  error: string | null
  onSave: (input: CreateAutomationRuleInput) => void
  onCancel: () => void
}

export function RuleForm({ templatePreset, initialRule, saving, error, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() =>
    initialRule ? ruleToForm(initialRule) : getDefaultForm(templatePreset)
  )
  const [activeStep, setActiveStep] = useState<StepId | null>('trigger')

  const { token } = useAuthStore(useShallow(state => ({ token: state.token })))
  const { conversations, loadConversations } = useChatStore(
    useShallow(state => ({
      conversations: state.conversations,
      loadConversations: state.loadConversations,
    }))
  )

  useEffect(() => {
    if (token && conversations.length === 0) {
      loadConversations(token).catch(() => undefined)
    }
  }, [conversations.length, loadConversations, token])

  const channels = conversations.filter(
    c => c.type === 'PUBLIC_CHANNEL' || c.type === 'PRIVATE_CHANNEL'
  )
  const selectedChannel = channels.find(c => c.id === form.targetChannelId)

  const canSubmit =
    form.name.trim() &&
    form.instruction.trim() &&
    (form.triggerType !== 'MESSAGE_KEYWORD' || form.keywords.trim()) &&
    (form.targetType === 'DM_TRIGGER_USER' || form.targetChannelId)

  function toggleStep(step: StepId) {
    setActiveStep(prev => (prev === step ? null : step))
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Rule Configuration
          </p>
          <input
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Give this rule a name…"
            className="w-full border-0 border-b border-transparent bg-transparent p-0 text-lg font-semibold text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-200"
            autoFocus={!initialRule}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Workflow steps */}
      <div className="flex flex-col">
        {/* ── Trigger step ── */}
        <WorkflowStep
          icon={<Play className="size-3.5" />}
          label="Trigger"
          isLast={false}
          expanded={activeStep === 'trigger'}
          onToggle={() => toggleStep('trigger')}
          summary={triggerLabel(form)}
        >
          {/* Trigger type selector */}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-slate-600">Trigger event</label>
            <div className="relative">
              <select
                value={form.triggerType}
                onChange={e => {
                  const type = e.target.value as AutomationTriggerType
                  setForm(prev => ({
                    ...prev,
                    triggerType: type,
                    targetType: type === 'MEMBER_JOINED' ? 'DM_TRIGGER_USER' : 'CHANNEL',
                  }))
                }}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="SCHEDULE">Schedule — runs at a set time</option>
                <option value="MEMBER_JOINED">Member joins — fires when someone joins the workspace</option>
                <option value="MESSAGE_KEYWORD">Keyword match — fires when a message contains a keyword</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Schedule options */}
          {form.triggerType === 'SCHEDULE' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Frequency</label>
                <select
                  value={form.cronFrequency}
                  onChange={e => setForm(prev => ({ ...prev, cronFrequency: e.target.value as 'daily' | 'weekly' }))}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="daily">Every day</option>
                  <option value="weekly">Every Monday</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Time</label>
                <input
                  type="time"
                  value={form.cronTime}
                  onChange={e => setForm(prev => ({ ...prev, cronTime: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          )}

          {/* Keyword options */}
          {form.triggerType === 'MESSAGE_KEYWORD' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Keywords (comma-separated)</label>
              <input
                value={form.keywords}
                onChange={e => setForm(prev => ({ ...prev, keywords: e.target.value }))}
                placeholder="urgent, help, question"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          {form.triggerType === 'MEMBER_JOINED' && (
            <p className="text-xs text-slate-500">Fires once whenever a new user joins this workspace.</p>
          )}
        </WorkflowStep>

        {/* ── Action step ── */}
        <WorkflowStep
          icon={<Sparkles className="size-3.5" />}
          label="Action"
          isLast={true}
          expanded={activeStep === 'action'}
          onToggle={() => toggleStep('action')}
          summary={actionLabel(form, selectedChannel?.name ?? undefined)}
        >
          {/* Target */}
          {form.triggerType !== 'MEMBER_JOINED' ? (
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-slate-600">Post to channel</label>
              <div className="relative">
                <select
                  value={form.targetChannelId}
                  onChange={e => setForm(prev => ({ ...prev, targetChannelId: e.target.value }))}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select a channel…</option>
                  {channels.map(c => (
                    <option key={c.id} value={c.id}>{c.name ?? c.id}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          ) : (
            <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              The AI message will be sent as a DM directly to the new member.
            </div>
          )}

          {/* Instruction */}
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <SlidersHorizontal className="size-3 text-slate-400" />
              <label className="text-xs font-medium text-slate-600">AI instruction</label>
            </div>
            <textarea
              value={form.instruction}
              onChange={e => setForm(prev => ({ ...prev, instruction: e.target.value }))}
              rows={4}
              placeholder="Describe what the AI should write…"
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Variables:{' '}
              <code className="rounded bg-slate-100 px-1">{'{date}'}</code>{' '}
              <code className="rounded bg-slate-100 px-1">{'{user.name}'}</code>{' '}
              <code className="rounded bg-slate-100 px-1">{'{org.name}'}</code>
            </p>
          </div>
        </WorkflowStep>
      </div>

      {/* Footer */}
      <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
        <Button variant="ghost" className="h-9 rounded-lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!canSubmit || saving}
          onClick={() => onSave(formToInput(form))}
          className="h-9 min-w-28 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save rule
        </Button>
      </div>
    </div>
  )
}

type WorkflowStepProps = {
  icon: ReactNode
  label: string
  summary: string
  expanded: boolean
  onToggle: () => void
  isLast: boolean
  children: ReactNode
}

function WorkflowStep({ icon, label, summary, expanded, onToggle, isLast, children }: WorkflowStepProps) {
  return (
    <div className="flex gap-3">
      {/* Left: icon + line */}
      <div className="flex flex-col items-center">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-500">
          {icon}
        </div>
        {!isLast && <div className="my-1 w-0.5 flex-1 bg-slate-200" style={{ minHeight: 24 }} />}
      </div>

      {/* Right: content */}
      <div className="flex-1 pb-5">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
            <span className="text-sm text-slate-700">{summary}</span>
          </div>
          {expanded
            ? <ChevronUp className="size-4 shrink-0 text-slate-400" />
            : <ChevronDown className="size-4 shrink-0 text-slate-400" />
          }
        </button>

        {expanded && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-4">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
