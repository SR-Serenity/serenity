'use client'

import { CheckCircle2, Circle, ClipboardList, Pencil, Trash2 } from 'lucide-react'
import type { Task } from '@serenity/api'
import { cn } from '@/lib/utils'
import { DiceBearAvatar } from '@/components/dicebear-avatar'
import { AiBadge, SourceBadge, StatusBadge } from './task-badges'

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
  return {
    label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    overdue: date < today,
  }
}

function AssigneeAvatar({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="text-gray-300">—</span>
  return (
    <span className="inline-flex items-center gap-2">
      <DiceBearAvatar seed={name} name={name} className="size-6 shadow-sm" />
      <span className="text-sm text-gray-700">{name}</span>
    </span>
  )
}

const PRIORITY_PILL: Record<string, string> = {
  HIGH:   'bg-rose-50 text-rose-600 border border-rose-200',
  MEDIUM: 'bg-amber-50 text-amber-600 border border-amber-200',
  LOW:    'bg-slate-50 text-slate-500 border border-slate-200',
}

export function TaskTable({ tasks, selectedTaskId, onSelect, onToggleDone, onEdit, onDelete }: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 shadow-inner ring-1 ring-black/5">
          <ClipboardList className="size-7 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-800">No tasks here</p>
          <p className="mt-1 text-sm text-gray-500">
            Create a task or let AI generate them from a conversation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
            <th className="w-10 px-3 py-2.5" />
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">
              Task
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">
              Status
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">
              Assignee
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">
              Priority
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">
              Due
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">
              Source
            </th>
            <th className="w-20 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, i) => {
            const due = formatDue(task.dueDate)
            const done = task.status === 'DONE'
            const isSelected = selectedTaskId === task.id
            return (
              <tr
                key={task.id}
                onClick={() => onSelect(task.id)}
                className={cn(
                  'group cursor-pointer transition-colors',
                  i !== 0 && 'border-t border-gray-100',
                  isSelected
                    ? 'bg-blue-50/70 hover:bg-blue-50/80'
                    : 'hover:bg-gray-50/80',
                  done && 'opacity-55',
                )}
              >
                {/* Complete toggle */}
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleDone(task) }}
                    title={done ? 'Mark as to do' : 'Mark as done'}
                    className="flex items-center justify-center text-gray-300 transition-colors hover:text-emerald-500"
                  >
                    {done
                      ? <CheckCircle2 className="size-[18px] text-emerald-500" />
                      : <Circle className="size-[18px] opacity-0 transition-opacity group-hover:opacity-100" />
                    }
                  </button>
                </td>

                {/* Title */}
                <td className="px-3 py-3 max-w-[320px]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate font-medium',
                        done ? 'text-gray-400 line-through' : 'text-gray-800',
                        isSelected && !done && 'text-gray-900',
                      )}
                    >
                      {task.title}
                    </span>
                    {task.createdByAi && <AiBadge />}
                  </div>
                </td>

                {/* Status */}
                <td className="px-3 py-3">
                  <StatusBadge status={task.status} />
                </td>

                {/* Assignee */}
                <td className="px-3 py-3">
                  <AssigneeAvatar name={task.assigneeName} />
                </td>

                {/* Priority */}
                <td className="px-3 py-3">
                  <span className={cn(
                    'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold',
                    PRIORITY_PILL[task.priority],
                  )}>
                    {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                  </span>
                </td>

                {/* Due date */}
                <td className="px-3 py-3 tabular-nums">
                  {due.overdue && !done ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                      <span className="size-1.5 rounded-full bg-rose-400" />
                      {due.label}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">{due.label}</span>
                  )}
                </td>

                {/* Source */}
                <td className="px-3 py-3">
                  <SourceBadge sourceType={task.sourceType} />
                </td>

                {/* Row actions */}
                <td className="px-2 py-3">
                  <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEdit(task) }}
                      title="Edit"
                      className="flex size-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete(task) }}
                      title="Delete"
                      className="flex size-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
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
