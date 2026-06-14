'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
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
      .then((res) => active && setMembers(res.members))
      .catch(() => undefined)

    aiApi
      .extractTasks(token, {
        authContext,
        conversationContext,
        sourceTitle: conversationTitle,
      })
      .then((res) => {
        if (!active) return
        setDrafts(res.proposedTasks.map((t) => ({ ...t, selected: true })))
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to generate tasks')
        setLoading(false)
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedCount = useMemo(
    () => drafts.filter((d) => d.selected).length,
    [drafts],
  )

  function patchDraft(index: number, patch: Partial<DraftTask>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function resolveAssigneeId(name: string | null): string | null {
    if (!name) return null
    const match = members.find(
      (m) => m.displayName.toLowerCase() === name.toLowerCase(),
    )
    return match?.id ?? null
  }

  async function handleConfirm() {
    if (confirming) return
    const selected = drafts.filter((d) => d.selected)
    if (selected.length === 0) {
      onClose()
      return
    }
    setConfirming(true)
    setError(null)
    try {
      await Promise.all(
        selected.map((d) =>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
              <Sparkles className="size-4 text-primary" />
              AI Suggested Tasks
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              Based on: {conversationTitle}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} title="Close">
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
            <div className="py-12 text-center text-sm text-muted-foreground">
              No clear follow-up tasks were found in this conversation.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The AI found {drafts.length} possible follow-up task
                {drafts.length === 1 ? '' : 's'}.
              </p>
              {drafts.map((draft, index) => (
                <div
                  key={index}
                  className={cn(
                    'rounded-xl border p-3 transition-colors',
                    draft.selected ? 'border-primary/40 bg-primary/5' : 'border-border',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={draft.selected}
                      onChange={(e) => patchDraft(index, { selected: e.target.checked })}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        value={draft.title}
                        onChange={(e) => patchDraft(index, { title: e.target.value })}
                        className="h-8 font-medium"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={draft.assigneeName ?? ''}
                          onChange={(e) =>
                            patchDraft(index, { assigneeName: e.target.value || null })
                          }
                          className="h-7 rounded-lg border border-input bg-background px-2 text-xs outline-none"
                        >
                          <option value="">Unassigned</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.displayName}>
                              {m.displayName}
                            </option>
                          ))}
                          {draft.assigneeName &&
                          !members.some(
                            (m) =>
                              m.displayName.toLowerCase() ===
                              draft.assigneeName!.toLowerCase(),
                          ) ? (
                            <option value={draft.assigneeName}>{draft.assigneeName}</option>
                          ) : null}
                        </select>
                        <Input
                          type="date"
                          value={toDateInput(draft.dueDate)}
                          onChange={(e) =>
                            patchDraft(index, { dueDate: e.target.value || null })
                          }
                          className="h-7 text-xs"
                        />
                        <select
                          value={draft.priority}
                          onChange={(e) =>
                            patchDraft(index, { priority: e.target.value as TaskPriority })
                          }
                          className="h-7 rounded-lg border border-input bg-background px-2 text-xs outline-none"
                        >
                          {PRIORITIES.map((p) => (
                            <option key={p} value={p}>
                              {p.toLowerCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Reason:</span> {draft.reason}
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
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={confirming}
            className="text-muted-foreground"
          >
            Reject All
          </Button>
          <Button onClick={handleConfirm} disabled={loading || confirming || selectedCount === 0}>
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm Selected ({selectedCount})
          </Button>
        </div>
      </div>
    </div>
  )
}
