'use client'

import { CheckCircle2, Circle, ClipboardList, Pencil, Trash2 } from 'lucide-react'
import type { Task } from '@serenity/api'
import { cn } from '@/lib/utils'
import { AiBadge, PriorityBar, SourceBadge, StatusBadge } from './task-badges'

type TaskTableProps = {
  tasks: Task[]
  selectedTaskId: string | null
  onSelect: (taskId: string) => void
  onToggleDone: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

function formatDue(iso: string | null): { label: string; overdue: boolean } {
  if (!iso) return { label: '—', overdue: false }
  const date = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdue = date < today
  return {
    label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    overdue,
  }
}

function AssigneeAvatar({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="text-muted-foreground">—</span>
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand">
        {initials}
      </span>
      <span className="text-foreground">{name}</span>
    </span>
  )
}

export function TaskTable({
  tasks,
  selectedTaskId,
  onSelect,
  onToggleDone,
  onEdit,
  onDelete,
}: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12">
        <div className="flex size-12 items-center justify-center rounded-full bg-gray-100">
          <ClipboardList className="size-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">No tasks found</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Create a task or generate them from a chat conversation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
          <tr className="border-b border-gray-100">
            <th className="w-10 px-3 py-2.5" />
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Task
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Assignee
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Priority
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Due
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source
            </th>
            {/* actions column — no header label */}
            <th className="w-20 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tasks.map((task) => {
            const due = formatDue(task.dueDate)
            const done = task.status === 'DONE'
            const isSelected = selectedTaskId === task.id
            return (
              <tr
                key={task.id}
                onClick={() => onSelect(task.id)}
                className={cn(
                  'group cursor-pointer transition-colors hover:bg-gray-50',
                  isSelected && 'bg-brand/5 hover:bg-brand/5',
                  done && 'opacity-60',
                )}
              >
                {/* Complete toggle */}
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleDone(task)
                    }}
                    title={done ? 'Mark as to do' : 'Mark as done'}
                    className="flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {done ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <Circle className="size-4 opacity-50 group-hover:opacity-100" />
                    )}
                  </button>
                </td>

                {/* Title */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <PriorityBar priority={task.priority} />
                    <span
                      className={cn(
                        'font-medium text-foreground',
                        done && 'text-muted-foreground line-through',
                      )}
                    >
                      {task.title}
                    </span>
                    {task.createdByAi ? <AiBadge /> : null}
                  </div>
                </td>

                {/* Status */}
                <td className="px-3 py-3">
                  <StatusBadge status={task.status} />
                </td>

                {/* Assignee */}
                <td className="px-3 py-3 text-sm">
                  <AssigneeAvatar name={task.assigneeName} />
                </td>

                {/* Priority */}
                <td className="px-3 py-3 text-xs text-muted-foreground capitalize">
                  {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                </td>

                {/* Due date */}
                <td
                  className={cn(
                    'px-3 py-3 text-sm tabular-nums',
                    due.overdue && !done
                      ? 'font-medium text-rose-600 dark:text-rose-400'
                      : 'text-muted-foreground',
                  )}
                >
                  {due.overdue && !done ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-rose-500" />
                      {due.label}
                    </span>
                  ) : (
                    due.label
                  )}
                </td>

                {/* Source */}
                <td className="px-3 py-3">
                  <SourceBadge sourceType={task.sourceType} />
                </td>

                {/* Row actions — visible on hover */}
                <td className="px-2 py-3">
                  <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(task)
                      }}
                      title="Edit task"
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-gray-200 hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(task)
                      }}
                      title="Delete task"
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-100 hover:text-rose-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
