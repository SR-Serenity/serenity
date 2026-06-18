'use client'

import Link from 'next/link'
import { CalendarDays, ExternalLink, Pencil, Sparkles, Trash2, User, X } from 'lucide-react'
import type { Task } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { cn } from '@/lib/utils'
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
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function MetaRow({ icon: Icon, label, children }: { icon?: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="text-right text-sm text-gray-700">{children}</div>
    </div>
  )
}

export function TaskDetailPanel({ task, orgSlug, onClose, onEdit, onDelete }: TaskDetailPanelProps) {
  const sourceHref =
    task.sourceType === 'CHAT' && task.sourceId ? `/${orgSlug}/chat/${task.sourceId}` : null

  const isOverdue = task.dueDate && task.status !== 'DONE' && task.status !== 'CANCELLED'
    && new Date(task.dueDate) < new Date()

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-gray-100 bg-white shadow-[-8px_0_24px_-8px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Detail</span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" onClick={onEdit} title="Edit task">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} title="Delete task"
            className="hover:bg-rose-50 hover:text-rose-500">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose} title="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {/* Title section */}
        <div className="border-b border-gray-50 px-5 py-5">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.createdByAi && <AiBadge />}
          </div>
          <h3 className={cn(
            'text-[15px] font-semibold leading-snug',
            task.status === 'DONE' ? 'text-gray-400 line-through' : 'text-gray-900',
          )}>
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-500">
              {task.description}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="divide-y divide-gray-50 px-5 py-1">
          <MetaRow icon={User} label="Assignee">
            {task.assigneeName ? (
              <span className="flex items-center justify-end gap-2">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-[9px] font-bold text-white">
                  {task.assigneeName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </span>
                {task.assigneeName}
              </span>
            ) : (
              <span className="text-gray-400">Unassigned</span>
            )}
          </MetaRow>

          <MetaRow icon={CalendarDays} label="Due date">
            {task.dueDate ? (
              <span className={cn(
                'inline-flex items-center gap-1.5',
                isOverdue ? 'font-medium text-rose-600' : 'text-gray-700',
              )}>
                {isOverdue && <span className="size-1.5 rounded-full bg-rose-400" />}
                {formatDate(task.dueDate)}
              </span>
            ) : (
              <span className="text-gray-400">No due date</span>
            )}
          </MetaRow>
        </div>

        {/* Source */}
        {(task.sourceType !== 'MANUAL' || task.sourceTitle) && (
          <div className="border-t border-gray-100 px-5 py-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Source</p>
            <div className="flex items-center justify-between">
              <SourceBadge sourceType={task.sourceType} />
              {sourceHref && (
                <Link
                  href={sourceHref}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
            {task.sourceTitle && (
              <p className="mt-1.5 text-sm text-gray-500">{task.sourceTitle}</p>
            )}
          </div>
        )}

        {/* AI reason */}
        {task.createdByAi && (
          <div className="border-t border-gray-100 px-5 py-4">
            <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50/50 p-3.5">
              <div className="mb-2 flex items-center gap-1.5">
                <div className="flex size-5 items-center justify-center rounded-full bg-violet-100">
                  <Sparkles className="size-3 text-violet-600" />
                </div>
                <span className="text-xs font-semibold text-violet-700">AI reasoning</span>
              </div>
              <p className="text-sm leading-relaxed text-violet-900/70">
                {task.aiReason ?? 'Suggested based on workspace context.'}
              </p>
            </div>
          </div>
        )}

        {/* Activity footer */}
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Activity</p>
          <div className="space-y-1.5 text-xs text-gray-400">
            {task.createdByName && (
              <p>Created by <span className="font-medium text-gray-600">{task.createdByName}</span></p>
            )}
            <p>Created {formatDate(task.createdAt)}</p>
            {task.updatedAt !== task.createdAt && (
              <p>Updated {formatDate(task.updatedAt)}</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
