'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ChevronDown, Kanban, LayoutList, Loader2, Plus, Search } from 'lucide-react'
import { orgApi } from '@serenity/api'
import type { CreateTaskInput, Member, Task, TaskStatus } from '@serenity/api'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/auth-store'
import { useTaskStore, type TaskTab } from '@/stores/task-store'
import { Button } from '@/app/shared/components/ui/button'
import { cn } from '@/lib/utils'
import { TaskTable } from './components/task-table'
import { TaskKanban } from './components/task-kanban'
import { TaskDetailPanel } from './components/task-detail-panel'
import { TaskFormDialog } from './components/task-form-dialog'

const TABS: { id: TaskTab; label: string }[] = [
  { id: 'all', label: 'All Tasks' },
  { id: 'mine', label: 'My Tasks' },
  { id: 'ai', label: 'AI-generated' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
]

type ViewMode = 'list' | 'board'

export default function TasksPage() {
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug

  const { token, currentOrg } = useAuthStore(
    useShallow((s) => ({ token: s.token, currentOrg: s.currentOrg })),
  )

  const {
    tasks,
    selectedTaskId,
    activeTab,
    filters,
    isLoading,
    error,
    setTab,
    setFilters,
    setSelectedTask,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
  } = useTaskStore()

  const [members, setMembers] = useState<Member[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [view, setView] = useState<ViewMode>('list')

  useEffect(() => {
    if (!token || !currentOrg) return
    let active = true
    orgApi
      .listMembers(currentOrg.id, token)
      .then((res) => { if (active) setMembers(res.members) })
      .catch(() => undefined)
    return () => { active = false }
  }, [token, currentOrg])

  useEffect(() => {
    void loadTasks(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab, filters])

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  )

  const handleCreate = useCallback(async (input: CreateTaskInput) => {
    if (!token) return
    await createTask(token, input)
  }, [token, createTask])

  const handleEdit = useCallback(async (input: CreateTaskInput) => {
    if (!token || !editingTask) return
    await updateTask(token, editingTask.id, input)
  }, [token, editingTask, updateTask])

  const handleToggleDone = useCallback(async (task: Task) => {
    if (!token) return
    await updateTask(token, task.id, { status: task.status === 'DONE' ? 'TODO' : 'DONE' })
  }, [token, updateTask])

  const handleDelete = useCallback(async (task: Task) => {
    if (!token) return
    await deleteTask(token, task.id)
  }, [token, deleteTask])

  const handleStatusChange = useCallback(async (task: Task, status: TaskStatus) => {
    if (!token) return
    await updateTask(token, task.id, { status })
  }, [token, updateTask])

  const hasActiveFilters = filters.status !== 'ALL' || filters.priority !== 'ALL' || filters.assigneeId !== 'ALL' || filters.search !== ''

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Page header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-3.5">
          <h1 className="text-[1.25rem] font-bold tracking-tight text-gray-900">Tasks</h1>
          <div className="flex items-center gap-2">
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
            <Button onClick={() => setShowCreate(true)} className="gap-1.5 rounded-lg px-4 text-sm">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>

        {/* Tabs + view switcher */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6">
          <div className="flex items-center">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={cn(
                  'relative px-3.5 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'text-gray-900 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-blue-500'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="mb-1.5 flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                view === 'list'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setView('board')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                view === 'board'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Kanban className="h-3.5 w-3.5" />
              Board
            </button>
          </div>
        </div>

        {/* Filters toolbar */}
        <div className={cn(
          'flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 px-6 py-2.5',
          'bg-gray-50/50',
        )}>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              placeholder="Search tasks…"
              className="h-8 w-52 rounded-full border border-gray-200 bg-white pl-9 pr-3 text-[13px] text-gray-700 outline-none placeholder:text-gray-400 transition-shadow focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
            />
          </div>

          <div className="h-4 w-px bg-gray-200" />

          <FilterPill
            label="Status"
            value={filters.status}
            onChange={(v) => setFilters({ status: v as typeof filters.status })}
            options={[
              ['ALL', 'Status'],
              ['TODO', 'To do'],
              ['IN_PROGRESS', 'In progress'],
              ['DONE', 'Done'],
              ['CANCELLED', 'Cancelled'],
            ]}
          />
          <FilterPill
            label="Priority"
            value={filters.priority}
            onChange={(v) => setFilters({ priority: v as typeof filters.priority })}
            options={[
              ['ALL', 'Priority'],
              ['HIGH', 'High'],
              ['MEDIUM', 'Medium'],
              ['LOW', 'Low'],
            ]}
          />
          <FilterPill
            label="Assignee"
            value={filters.assigneeId}
            onChange={(v) => setFilters({ assigneeId: v })}
            options={[
              ['ALL', 'Assignee'],
              ...members.map((m) => [m.id, m.displayName] as [string, string]),
            ]}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters({ status: 'ALL', priority: 'ALL', assigneeId: 'ALL', search: '' })}
              className="ml-1 flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>

        {error ? (
          <div className="shrink-0 border-b border-rose-100 bg-rose-50 px-6 py-2 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {view === 'list' ? (
          <TaskTable
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelect={setSelectedTask}
            onToggleDone={handleToggleDone}
            onEdit={(task) => setEditingTask(task)}
            onDelete={handleDelete}
          />
        ) : (
          <TaskKanban
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelect={setSelectedTask}
            onEdit={(task) => setEditingTask(task)}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onAddTask={() => setShowCreate(true)}
          />
        )}
      </div>

      {selectedTask ? (
        <TaskDetailPanel
          task={selectedTask}
          orgSlug={orgSlug}
          onClose={() => setSelectedTask(null)}
          onEdit={() => setEditingTask(selectedTask)}
          onDelete={() => handleDelete(selectedTask)}
        />
      ) : null}

      {showCreate ? (
        <TaskFormDialog
          members={members}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      ) : null}

      {editingTask ? (
        <TaskFormDialog
          task={editingTask}
          members={members}
          onClose={() => setEditingTask(null)}
          onSubmit={handleEdit}
        />
      ) : null}
    </div>
  )
}

function FilterPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: [string, string][]
  onChange: (value: string) => void
}) {
  const isActive = value !== 'ALL'
  const activeLabel = options.find(([v]) => v === value)?.[1]

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={cn(
          'flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 text-[13px] transition-all',
          isActive
            ? 'border-blue-300 bg-blue-50 font-medium text-blue-700 shadow-sm'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
        )}
      >
        <span>{isActive ? activeLabel : label}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', isActive ? 'text-blue-500' : 'text-gray-400')} />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      >
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>
            {lbl}
          </option>
        ))}
      </select>
    </div>
  )
}
