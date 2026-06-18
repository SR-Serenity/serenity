'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2, Plus, Zap, Pencil, Trash2, Clock,
  CheckSquare, MessageSquare, Users, Sparkles,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { automationApi } from '@serenity/api'
import type { AutomationRule, AutomationTriggerType } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import {
  WORKFLOW_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
  type WorkflowTemplate,
} from './components/workflow-templates'
import { TemplatePreviewModal } from './components/template-preview-modal'

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  SCHEDULE: 'Schedule',
  MEMBER_JOINED: 'Member joins',
  MESSAGE_KEYWORD: 'Keyword match',
  TASK_CREATED: 'Task created',
  TASK_STATUS_CHANGED: 'Status changed',
  TASK_ASSIGNED: 'Task assigned',
}

const TRIGGER_ICONS: Record<AutomationTriggerType, React.ComponentType<{ className?: string }>> = {
  SCHEDULE: Clock,
  MEMBER_JOINED: Users,
  MESSAGE_KEYWORD: MessageSquare,
  TASK_CREATED: CheckSquare,
  TASK_STATUS_CHANGED: CheckSquare,
  TASK_ASSIGNED: CheckSquare,
}

export default function AutomationPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const { token } = useAuthStore(useShallow(s => ({ token: s.token })))

  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('All')
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredTemplates = activeCategory === 'All'
    ? WORKFLOW_TEMPLATES
    : WORKFLOW_TEMPLATES.filter(t => t.category === activeCategory)

  const loadRules = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await automationApi.listRules(token)
      setRules(res.rules)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { void loadRules() }, [loadRules])

  async function handleToggle(rule: AutomationRule) {
    if (!token) return
    try {
      const updated = await automationApi.toggleRule(token, rule.id, !rule.enabled)
      setRules(prev => prev.map(r => r.id === updated.id ? updated : r))
    } catch { /* silent */ }
  }

  async function handleDelete(ruleId: string) {
    if (!token) return
    setDeletingId(ruleId)
    try {
      await automationApi.deleteRule(token, ruleId)
      setRules(prev => prev.filter(r => r.id !== ruleId))
    } catch { /* silent */ } finally {
      setDeletingId(null)
    }
  }

  function handleUseTemplate(template: WorkflowTemplate) {
    setPreviewTemplate(null)
    router.push(`/${orgSlug}/automation/new?template=${template.id}`)
  }

  return (
    <div className="flex h-full bg-panel">
      {/* ── Left sidebar ── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-black/8 bg-white">
        <div className="px-3 pt-4 pb-3 space-y-0.5">
          <button
            onClick={() => router.push(`/${orgSlug}/automation/new`)}
            className="flex h-8 w-full items-center gap-2 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white transition hover:bg-brand-hover"
          >
            <Plus className="size-3.5" />
            New workflow
          </button>
          <button className="flex h-8 w-full items-center gap-2 rounded-lg px-3 text-[12px] font-medium text-muted-foreground transition hover:bg-ui hover:text-foreground">
            <Zap className="size-3.5" />
            All workflows
          </button>
        </div>

        {/* Existing rules list */}
        <div className="mt-3 flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length > 0 ? (
            <>
              <p className="px-5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Recent
              </p>
              {rules.map(rule => {
                const TriggerIcon = TRIGGER_ICONS[rule.triggerType]
                return (
                  <button
                    key={rule.id}
                    onClick={() => router.push(`/${orgSlug}/automation/${rule.id}`)}
                    className="group flex w-full items-center gap-2 rounded-md px-4 py-1.5 text-left text-[12px] text-foreground transition hover:bg-ui"
                  >
                    <TriggerIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{rule.name}</span>
                    <span className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      rule.enabled ? 'bg-emerald-400' : 'bg-slate-300',
                    )} />
                  </button>
                )
              })}
            </>
          ) : !loading && (
            <p className="px-5 py-3 text-[11px] text-muted-foreground/60">No workflows yet</p>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto no-scrollbar">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/6 bg-panel/80 px-8 py-4 backdrop-blur-sm">
          <div>
            <h1 className="text-[18px] font-bold text-foreground">Workflow templates</h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Pick a template, start from scratch, or generate with AI
            </p>
          </div>

          {/* AI generation button */}
          <button
            onClick={() => router.push(`/${orgSlug}/automation/new`)}
            className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 transition hover:bg-purple-100"
          >
            <div className="flex size-5 items-center justify-center rounded-full bg-purple-500">
              <Sparkles className="size-3 text-white" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-purple-800">Generate with AI</p>
              <p className="text-[10px] text-purple-500">Describe your workflow</p>
            </div>
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1 border-b border-black/6 px-8 pt-4 pb-0">
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'border-b-2 px-3 pb-3 text-[13px] font-medium transition-colors',
                activeCategory === cat
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="grid gap-3 p-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Build from scratch card — always first */}
          {activeCategory === 'All' && (
            <button
              type="button"
              onClick={() => router.push(`/${orgSlug}/automation/new`)}
              className="group flex flex-col rounded-xl border-2 border-dashed border-black/10 bg-white p-4 text-left transition-all hover:border-brand/30 hover:shadow-md"
            >
              <div className="mb-3 flex size-7 items-center justify-center rounded-lg border border-black/6 bg-panel">
                <Pencil className="size-3.5 text-brand" />
              </div>
              <h3 className="text-[13px] font-semibold text-foreground">Start from scratch</h3>
              <p className="mt-1 flex-1 text-[11px] leading-relaxed text-muted-foreground">
                Design your own custom workflow with any trigger and action combination.
              </p>
            </button>
          )}

          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => setPreviewTemplate(template)}
            />
          ))}

          {filteredTemplates.length === 0 && (
            <div className="col-span-3 flex h-36 items-center justify-center rounded-xl border border-dashed border-black/10 text-sm text-muted-foreground">
              No templates in this category.
            </div>
          )}
        </div>

        {/* Active workflows table */}
        {!loading && rules.length > 0 && (
          <div className="border-t border-black/6 px-8 py-8">
            <h2 className="mb-4 text-[15px] font-semibold text-foreground">
              Active workflows
              <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                {rules.length}
              </span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-black/8 bg-white">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-black/6 bg-ui/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Trigger</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {rules.map(rule => {
                    const TriggerIcon = TRIGGER_ICONS[rule.triggerType]
                    return (
                      <tr key={rule.id} className="group transition-colors hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{rule.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            <TriggerIcon className="size-3" />
                            {TRIGGER_LABELS[rule.triggerType]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggle(rule)}
                            className="flex items-center gap-2"
                          >
                            <span className={cn(
                              'relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
                              rule.enabled ? 'bg-brand' : 'bg-slate-200',
                            )}>
                              <span className={cn(
                                'inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200',
                                rule.enabled ? 'translate-x-3' : 'translate-x-0',
                              )} />
                            </span>
                            <span className={cn('text-[11px]', rule.enabled ? 'text-brand' : 'text-slate-400')}>
                              {rule.enabled ? 'On' : 'Off'}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => router.push(`/${orgSlug}/automation/${rule.id}`)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(rule.id)}
                              disabled={deletingId === rule.id}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                            >
                              {deletingId === rule.id
                                ? <Loader2 className="size-3.5 animate-spin" />
                                : <Trash2 className="size-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Template preview modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={() => handleUseTemplate(previewTemplate)}
        />
      )}
    </div>
  )
}

function TemplateCard({ template, onClick }: { template: WorkflowTemplate; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col rounded-xl border border-black/8 bg-white p-4 text-left transition-all hover:border-brand/20 hover:shadow-md"
    >
      {/* Icon cluster */}
      <div className="mb-3 flex items-center gap-1.5">
        {template.icons.map((Icon, i) => (
          <div key={i} className="flex size-7 items-center justify-center rounded-lg border border-black/6 bg-panel">
            <Icon className={cn('size-3.5', template.iconColors[i])} />
          </div>
        ))}
      </div>

      <h3 className="text-[13px] font-semibold text-foreground">{template.name}</h3>
      <p className="mt-1 flex-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
        {template.description}
      </p>
    </button>
  )
}
