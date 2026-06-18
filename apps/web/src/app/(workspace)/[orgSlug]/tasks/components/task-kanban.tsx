'use client'

import { useMemo } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { useState } from 'react'
import { Plus, CalendarDays, User } from 'lucide-react'
import type { Task, TaskStatus } from '@serenity/api'
import { cn } from '@/lib/utils'
import { PriorityBar, StatusDot } from './task-badges'

const COLUMNS: { status: TaskStatus; label: string; headerClass: string; countClass: string }[] = [
  { status: 'TODO',        label: 'To Do',       headerClass: 'border-t-slate-300',   countClass: 'bg-slate-100 text-slate-600' },
  { status: 'IN_PROGRESS', label: 'In Progress',  headerClass: 'border-t-blue-400',    countClass: 'bg-blue-50 text-blue-600' },
  { status: 'DONE',        label: 'Done',         headerClass: 'border-t-emerald-400', countClass: 'bg-emerald-50 text-emerald-600' },
  { status: 'CANCELLED',   label: 'Cancelled',    headerClass: 'border-t-slate-200',   countClass: 'bg-slate-50 text-slate-400' },
]

type Props = {
  tasks: Task[]
  selectedTaskId: string | null
  onSelect: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onStatusChange: (task: Task, status: TaskStatus) => Promise<void>
  onAddTask: () => void
}

export function TaskKanban({ tasks, selectedTaskId, onSelect, onEdit, onDelete, onStatusChange, onAddTask }: Props) {
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [], CANCELLED: [] }
    for (const task of tasks) {
      map[task.status].push(task)
    }
    return map
  }, [tasks])

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined
    if (task) setDraggingTask(task)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingTask(null)
    const task = event.active.data.current?.task as Task | undefined
    const newStatus = event.over?.data.current?.status as TaskStatus | undefined
    if (!task || !newStatus || task.status === newStatus) return
    await onStatusChange(task, newStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 gap-3 overflow-x-auto p-4">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.status}
            column={col}
            tasks={byStatus[col.status]}
            selectedTaskId={selectedTaskId}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddTask={col.status === 'TODO' ? onAddTask : undefined}
          />
        ))}
      </div>

      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {draggingTask ? (
          <CardContent task={draggingTask} selected={false} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

type ColumnProps = {
  column: typeof COLUMNS[0]
  tasks: Task[]
  selectedTaskId: string | null
  onSelect: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onAddTask?: () => void
}

function KanbanColumn({ column, tasks, selectedTaskId, onSelect, onEdit, onDelete, onAddTask }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column.status}`,
    data: { status: column.status },
  })

  return (
    <div className="flex w-72 shrink-0 flex-col">
      {/* Column header */}
      <div className={cn('mb-3 rounded-t-lg border-t-2 bg-white px-3 py-2.5 shadow-sm', column.headerClass)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusDot status={column.status} />
            <span className="text-sm font-semibold text-slate-800">{column.label}</span>
          </div>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', column.countClass)}>
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-16 flex-1 flex-col gap-2 rounded-b-lg p-1 transition-colors',
          isOver && 'bg-blue-50/60',
        )}
      >
        {tasks.map(task => (
          <KanbanCard
            key={task.id}
            task={task}
            selected={task.id === selectedTaskId}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}

        {tasks.length === 0 && (
          <div className={cn(
            'rounded-lg border-2 border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 transition-colors',
            isOver && 'border-blue-300 bg-blue-50 text-blue-400',
          )}>
            Drop tasks here
          </div>
        )}

        {onAddTask && (
          <button
            onClick={onAddTask}
            className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <Plus className="size-3.5" />
            Add task
          </button>
        )}
      </div>
    </div>
  )
}

type CardProps = {
  task: Task
  selected: boolean
  onSelect: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

function KanbanCard({ task, selected, onSelect, onEdit, onDelete }: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'touch-none',
        isDragging && 'opacity-40',
      )}
    >
      <CardContent
        task={task}
        selected={selected}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}

type CardContentProps = {
  task: Task
  selected: boolean
  isDragging?: boolean
  onSelect?: (id: string) => void
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

function CardContent({ task, selected, isDragging, onSelect, onEdit, onDelete }: CardContentProps) {
  const isOverdue = task.dueDate && task.status !== 'DONE' && task.status !== 'CANCELLED'
    && new Date(task.dueDate) < new Date()

  return (
    <div
      onClick={() => onSelect?.(task.id)}
      className={cn(
        'group cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-all',
        selected ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300 hover:shadow-md',
        isDragging && 'rotate-1 shadow-xl',
      )}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        <PriorityBar priority={task.priority} />
        <p className={cn(
          'flex-1 text-sm font-medium leading-snug text-slate-800',
          task.status === 'DONE' && 'line-through text-slate-400',
          task.status === 'CANCELLED' && 'text-slate-400',
        )}>
          {task.title}
        </p>
      </div>

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {task.assigneeName && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <User className="size-3" />
            {task.assigneeName}
          </span>
        )}
        {task.dueDate && (
          <span className={cn(
            'flex items-center gap-1 text-xs',
            isOverdue ? 'text-rose-500' : 'text-slate-400',
          )}>
            <CalendarDays className="size-3" />
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.createdByAi && (
          <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">AI</span>
        )}
      </div>

      {/* Hover actions */}
      {!isDragging && (onEdit || onDelete) && (
        <div className="mt-2 hidden items-center justify-end gap-1 group-hover:flex">
          {onEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(task) }}
              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(task) }}
              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
