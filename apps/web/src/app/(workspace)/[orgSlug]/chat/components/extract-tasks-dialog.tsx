'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2, Sparkles, X } from 'lucide-react'
import { aiApi, orgApi, tasksApi } from '@serenity/api'
import type { Member, ProposedTask, TaskPriority } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { cn } from '@/lib/utils'

type AuthContext = {
  orgId: string
  userId: string
  role?: string
  displayName?: string
  email?: string
  orgName?: string
  orgSlug?: string
}

type ExtractTasksDialogProps = {
  token: string
  conversationId: string
  conversationTitle: string
  conversationContext: { role: string; content: string }[]
  authContext: AuthContext
  onClose: () => void
  onCreated?: (count: number) => void
}

type DraftTask = ProposedTask & { selected: boolean }

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH']

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export function ExtractTasksDialog({
  token,
  conversationId,
  conversationTitle,
  conversationContext,
  authContext,
  onClose,
  onCreated,
}: ExtractTasksDialogProps) {
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<DraftTask[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    let active = true

    orgApi
      .listMembers(authContext.orgId, token)
      .then(res => active && setMembers(res.members))
      .catch(() => undefined)

    aiApi
      .extractTasks(token, { authContext, conversationContext, sourceTitle: conversationTitle })
      .then(res => {
        if (!active) return
        setDrafts(res.proposedTasks.map(t => ({ ...t, selected: true })))
        setLoading(false)
      })
      .catch(err => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to generate tasks')
        setLoading(false)
      })

    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedCount = useMemo(() => drafts.filter(d => d.selected).length, [drafts])

  function patchDraft(index: number, patch: Partial<DraftTask>) {
    setDrafts(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function resolveAssigneeId(name: string | null): string | null {
    if (!name) return null
    return members.find(m => m.displayName.toLowerCase() === name.toLowerCase())?.id ?? null
  }

  async function handleConfirm() {
    if (confirming) return
    const selected = drafts.filter(d => d.selected)
    if (selected.length === 0) { onClose(); return }
    setConfirming(true)
    setError(null)
    try {
      await Promise.all(
        selected.map(d =>
          tasksApi.createTask(token, {
            title: d.title,
            description: d.description,
            priority: d.priority,
            assigneeId: resolveAssigneeId(d.assigneeName),
            dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
            sourceType: 'CHAT',
            sourceId: conversationId,
            sourceTitle: conversationTitle,
            createdByAi: true,
            aiReason: d.reason,
          }),
        ),
      )
      onCreated?.(selected.length)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tasks')
      setConfirming(false)
    }
  }

  const selectClass = "h-7 w-full appearance-none rounded-lg border border-border bg-[var(--input-BackgroundColor)] px-2 pr-6 text-xs text-foreground outline-none transition-all duration-150 focus:ring-1 focus:ring-accent/30 focus:border-accent/60 cursor-pointer"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04]">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-foreground">
              <Sparkles className="size-4 text-primary" />
              AI Suggested Tasks
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">Based on: {conversationTitle}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing the conversation…
            </div>
          ) : drafts.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No clear follow-up tasks were found in this conversation.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {drafts.length} possible follow-up task{drafts.length === 1 ? '' : 's'} found.
              </p>
              {drafts.map((draft, index) => (
                <div
                  key={index}
                  className={cn(
                    'rounded-xl border p-3 transition-all duration-150',
                    draft.selected ? 'border-accent/35 bg-accent/[0.06]' : 'border-border',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={draft.selected}
                      onChange={e => patchDraft(index, { selected: e.target.checked })}
                      className="mt-1 accent-[var(--global-accent-BackgroundColor)] cursor-pointer"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        value={draft.title}
                        onChange={e => patchDraft(index, { title: e.target.value })}
                        className="h-8 font-medium focus-visible:ring-1 focus-visible:ring-accent/30 focus-visible:border-accent/60"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <select
                            value={draft.assigneeName ?? ''}
                            onChange={e => patchDraft(index, { assigneeName: e.target.value || null })}
                            className={selectClass}
                          >
                            <option value="">Unassigned</option>
                            {members.map(m => (
                              <option key={m.id} value={m.displayName}>{m.displayName}</option>
                            ))}
                            {draft.assigneeName && !members.some(m => m.displayName.toLowerCase() === draft.assigneeName!.toLowerCase()) && (
                              <option value={draft.assigneeName}>{draft.assigneeName}</option>
                            )}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        </div>
                        <Input
                          type="date"
                          value={toDateInput(draft.dueDate)}
                          onChange={e => patchDraft(index, { dueDate: e.target.value || null })}
                          className="h-7 text-xs focus-visible:ring-1 focus-visible:ring-accent/30 focus-visible:border-accent/60"
                        />
                        <div className="relative">
                          <select
                            value={draft.priority}
                            onChange={e => patchDraft(index, { priority: e.target.value as TaskPriority })}
                            className={selectClass}
                          >
                            {PRIORITIES.map(p => (
                              <option key={p} value={p}>{p.toLowerCase()}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Reason:</span> {draft.reason}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={confirming} className="text-muted-foreground">
            Reject All
          </Button>
          <Button onClick={handleConfirm} disabled={loading || confirming || selectedCount === 0} className="active:scale-[0.97]">
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm Selected ({selectedCount})
          </Button>
        </div>
      </div>
    </div>
  )
}
