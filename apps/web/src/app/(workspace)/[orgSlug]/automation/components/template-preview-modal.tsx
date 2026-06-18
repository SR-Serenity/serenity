'use client'

import { X, Clock, Users, MessageSquare, CheckSquare, Bot, Bell, Hash, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowTemplate } from './workflow-templates'

const TRIGGER_LABELS: Record<string, string> = {
  SCHEDULE: 'Scheduled time',
  MEMBER_JOINED: 'Member joins workspace',
  MESSAGE_KEYWORD: 'Keyword in message',
  TASK_CREATED: 'Task created',
  TASK_STATUS_CHANGED: 'Task status changes',
  TASK_ASSIGNED: 'Task assigned',
}

const TRIGGER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SCHEDULE: Clock,
  MEMBER_JOINED: Users,
  MESSAGE_KEYWORD: MessageSquare,
  TASK_CREATED: CheckSquare,
  TASK_STATUS_CHANGED: CheckSquare,
  TASK_ASSIGNED: CheckSquare,
}

const ACTION_LABELS: Record<string, string> = {
  AI_AGENT: 'AI Agent',
  NOTIFY: 'Notify user',
  CREATE_TASK: 'Create task',
  POST_CHANNEL: 'Post to channel',
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  AI_AGENT: Bot,
  NOTIFY: Bell,
  CREATE_TASK: CheckSquare,
  POST_CHANNEL: Hash,
}

const ACTION_COLORS: Record<string, string> = {
  AI_AGENT: 'border-purple-200 bg-purple-50 text-purple-700',
  NOTIFY: 'border-green-200 bg-green-50 text-green-700',
  CREATE_TASK: 'border-orange-200 bg-orange-50 text-orange-700',
  POST_CHANNEL: 'border-blue-200 bg-blue-50 text-blue-700',
}

interface Props {
  template: WorkflowTemplate
  onClose: () => void
  onUse: () => void
}

export function TemplatePreviewModal({ template, onClose, onUse }: Props) {
  const triggerNode = template.presetGraph.nodes.find(n => n.type === 'trigger')
  const actionNodes = template.presetGraph.nodes.filter(n => n.type === 'action')
  const allSteps = [triggerNode, ...actionNodes].filter(Boolean)

  const uniqueActionTypes = [...new Set(actionNodes.map(n => n.nodeType))]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal */}
      <div className="relative flex h-[580px] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="size-4" />
        </button>

        {/* Left — info */}
        <div className="flex w-[280px] shrink-0 flex-col border-r border-slate-100 p-6">
          <h2 className="pr-8 text-[17px] font-bold leading-snug text-slate-900">
            {template.name}
          </h2>

          <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
            {template.description}
          </p>

          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Trigger</p>
            {triggerNode && (() => {
              const Icon = TRIGGER_ICONS[triggerNode.nodeType] ?? Zap
              return (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12px] font-medium text-slate-700">
                  <Icon className="size-3.5 text-slate-500" />
                  {TRIGGER_LABELS[triggerNode.nodeType] ?? triggerNode.nodeType}
                </div>
              )
            })()}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Actions</p>
            <div className="flex flex-wrap gap-1.5">
              {uniqueActionTypes.map(type => {
                const Icon = ACTION_ICONS[type] ?? Zap
                return (
                  <div
                    key={type}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium',
                      ACTION_COLORS[type] ?? 'border-slate-200 bg-slate-50 text-slate-700',
                    )}
                  >
                    <Icon className="size-3.5" />
                    {ACTION_LABELS[type] ?? type}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-auto pt-6 flex flex-col gap-2">
            <button
              onClick={onUse}
              className="h-10 w-full rounded-xl bg-brand text-[13px] font-semibold text-white transition hover:bg-brand-hover"
            >
              Use this template
            </button>
            <button
              onClick={onClose}
              className="h-9 w-full rounded-xl text-[13px] font-medium text-slate-500 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Right — workflow preview */}
        <div className="relative flex-1 overflow-hidden bg-slate-50/60">
          {/* Dot grid */}
          <svg className="absolute inset-0 h-full w-full opacity-40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#cbd5e1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>

          {/* Steps */}
          <div className="relative flex h-full flex-col items-center justify-center gap-0 py-8">
            {/* Trigger icon badge */}
            <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-brand shadow-sm">
              <Zap className="size-4 text-white" />
            </div>

            {allSteps.map((step, i) => {
              const isTrigger = step!.type === 'trigger'
              const Icon = isTrigger
                ? (TRIGGER_ICONS[step!.nodeType] ?? Zap)
                : (ACTION_ICONS[step!.nodeType] ?? Zap)
              const label = isTrigger
                ? (TRIGGER_LABELS[step!.nodeType] ?? step!.nodeType)
                : (ACTION_LABELS[step!.nodeType] ?? step!.nodeType)

              return (
                <div key={step!.id} className="flex flex-col items-center">
                  {/* Connecting line */}
                  {i > 0 && <div className="h-6 w-px bg-slate-300" />}

                  <div className="flex items-center gap-3">
                    <span className="w-5 text-right text-[11px] font-semibold text-slate-400">{i + 1}</span>
                    <div className={cn(
                      'flex items-center gap-2.5 rounded-xl border-2 bg-white px-4 py-2.5 shadow-sm',
                      isTrigger ? 'border-slate-200' : 'border-slate-200',
                    )}>
                      <Icon className={cn(
                        'size-4 shrink-0',
                        isTrigger ? 'text-slate-500' : 'text-slate-500',
                      )} />
                      <span className="text-[13px] font-medium text-slate-800">{label}</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Trailing line + plus */}
            <div className="flex flex-col items-center">
              <div className="h-6 w-px bg-slate-300" />
              <div className="flex size-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400 shadow-sm text-sm">
                +
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
