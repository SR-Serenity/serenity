'use client'

import Link from 'next/link'
import { Pencil, Sparkles, Trash2, X } from 'lucide-react'
import type { Task } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { AiBadge, PriorityBadge, SourceBadge, StatusBadge } from './task-badges'

type TaskDetailPanelProps = {
  task: Task
  orgSlug: string
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm text-foreground">{children}</span>
    </div>
  )
}

export function TaskDetailPanel({ task, orgSlug, onClose, onEdit, onDelete }: TaskDetailPanelProps) {
  const sourceHref =
    task.sourceType === 'CHAT' && task.sourceId
      ? `/${orgSlug}/chat/${task.sourceId}`
      : null

  return (
    <aside className="flex h-full w-full max-w-sm shrink-0 flex-col border-l border-gray-100 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Task details</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onEdit} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          <SourceBadge sourceType={task.sourceType} />
          {task.createdByAi ? <AiBadge /> : null}
        </div>

        <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
        {task.description ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {task.description}
          </p>
        ) : null}

        <div className="mt-4 border-t border-gray-100 pt-2">
          <Field label="Assignee">{task.assigneeName ?? 'Unassigned'}</Field>
          <Field label="Due date">{formatDate(task.dueDate)}</Field>
        </div>

        {(task.sourceType !== 'MANUAL' || task.sourceTitle) ? (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source
            </p>
            <Field label="Type">
              <SourceBadge sourceType={task.sourceType} />
            </Field>
            {task.sourceTitle ? <Field label="From">{task.sourceTitle}</Field> : null}
            {sourceHref ? (
              <div className="pt-1 text-right">
                <Link href={sourceHref} className="text-sm text-primary hover:underline">
                  Open source →
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {task.createdByAi ? (
          <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50/60 p-3 dark:border-violet-900 dark:bg-violet-950/40">
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-3" />
              AI reason
            </p>
            <p className="text-sm text-foreground">
              {task.aiReason ?? 'Suggested by AI from workspace context.'}
            </p>
          </div>
        ) : null}

        <div className="mt-4 border-t border-gray-100 pt-3">
          <Field label="Created by">{task.createdByName ?? '—'}</Field>
          <Field label="Created">{formatDate(task.createdAt)}</Field>
          <Field label="Updated">{formatDate(task.updatedAt)}</Field>
        </div>
      </div>
    </aside>
  )
}
