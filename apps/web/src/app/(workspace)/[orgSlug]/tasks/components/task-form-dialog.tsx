'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Loader2, X } from 'lucide-react'
import type { CreateTaskInput, Member, Task, TaskPriority, TaskStatus } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { Label } from '@/app/shared/components/ui/label'

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH']

type TaskFormDialogProps = {
  task?: Task | null
  members: Member[]
  onClose: () => void
  onSubmit: (input: CreateTaskInput) => Promise<void>
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}

export function TaskFormDialog({ task, members, onClose, onSubmit }: TaskFormDialogProps) {
  const isEdit = Boolean(task)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'TODO')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM')
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '')
  const [dueDate, setDueDate] = useState(toDateInput(task?.dueDate))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task')
      setSaving(false)
    }
  }

  const selectClass = "h-8 w-full appearance-none rounded-lg border border-border bg-[var(--input-BackgroundColor)] px-2.5 pr-7 text-sm text-foreground outline-none transition-all duration-150 focus:ring-2 focus:ring-accent/30 focus:border-accent/60 disabled:opacity-50 cursor-pointer"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04]">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[15px] font-semibold text-foreground">
            {isEdit ? 'Edit task' : 'New task'}
          </h2>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 space-y-4 overflow-y-auto p-5">
          <div>
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Prepare final demo script"
              autoFocus
              disabled={saving}
              className="mt-1.5 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent/60"
            />
          </div>

          <div>
            <Label htmlFor="task-description">Description</Label>
            <textarea
              id="task-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional details…"
              disabled={saving}
              rows={3}
              className="mt-1.5 w-full resize-none rounded-lg border border-border bg-[var(--input-BackgroundColor)] px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-all duration-150 focus:ring-2 focus:ring-accent/30 focus:border-accent/60 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="task-status">Status</Label>
              <div className="relative mt-1.5">
                <select
                  id="task-status"
                  value={status}
                  onChange={e => setStatus(e.target.value as TaskStatus)}
                  disabled={saving}
                  className={selectClass}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div>
              <Label htmlFor="task-priority">Priority</Label>
              <div className="relative mt-1.5">
                <select
                  id="task-priority"
                  value={priority}
                  onChange={e => setPriority(e.target.value as TaskPriority)}
                  disabled={saving}
                  className={selectClass}
                >
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="task-assignee">Assignee</Label>
              <div className="relative mt-1.5">
                <select
                  id="task-assignee"
                  value={assigneeId}
                  onChange={e => setAssigneeId(e.target.value)}
                  disabled={saving}
                  className={selectClass}
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div>
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                disabled={saving}
                className="mt-1.5 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent/60"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !title.trim()} className="active:scale-[0.97]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? 'Save changes' : 'Create task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
