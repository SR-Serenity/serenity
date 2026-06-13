'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Plus, Search } from 'lucide-react'
import { orgApi } from '@serenity/api'
import type { CreateTaskInput, Member, Task } from '@serenity/api'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/auth-store'
import { useTaskStore, type TaskTab } from '@/stores/task-store'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { cn } from '@/lib/utils'
import { TaskTable } from './components/task-table'
import { TaskDetailPanel } from './components/task-detail-panel'
import { TaskFormDialog } from './components/task-form-dialog'

const TABS: { id: TaskTab; label: string }[] = [
  { id: 'all', label: 'All Tasks' },
  { id: 'mine', label: 'My Tasks' },
  { id: 'ai', label: 'AI-generated' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
]

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

  // Load members for assignee dropdowns / filters.
  useEffect(() => {
    if (!token || !currentOrg) return
    let active = true
    orgApi
      .listMembers(currentOrg.id, token)
      .then((res) => {
        if (active) setMembers(res.members)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [token, currentOrg])

  // Reload whenever tab or filters change.
  useEffect(() => {
    void loadTasks(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeTab, filters])

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  )

  const handleCreate = useCallback(
    async (input: CreateTaskInput) => {
      if (!token) return
      await createTask(token, input)
    },
    [token, createTask],
  )

  const handleEdit = useCallback(
    async (input: CreateTaskInput) => {
      if (!token || !editingTask) return
      await updateTask(token, editingTask.id, input)
    },
    [token, editingTask, updateTask],
  )

  const handleToggleDone = useCallback(
    async (task: Task) => {
      if (!token) return
      await updateTask(token, task.id, {
        status: task.status === 'DONE' ? 'TODO' : 'DONE',
      })
    },
    [token, updateTask],
  )

  const handleDelete = useCallback(
    async (task: Task) => {
      if (!token) return
      await deleteTask(token, task.id)
    },
    [token, deleteTask],
  )

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
            <p className="text-sm text-muted-foreground">
              Manage manual and AI-generated workflow tasks.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-100 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-6 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              placeholder="Search tasks"
              className="h-8 w-56 pl-8"
            />
          </div>
          <FilterSelect
            value={filters.status}
            onChange={(v) => setFilters({ status: v as typeof filters.status })}
            options={[
              ['ALL', 'All statuses'],
              ['TODO', 'To do'],
              ['IN_PROGRESS', 'In progress'],
              ['DONE', 'Done'],
              ['CANCELLED', 'Cancelled'],
            ]}
          />
          <FilterSelect
            value={filters.priority}
            onChange={(v) => setFilters({ priority: v as typeof filters.priority })}
            options={[
              ['ALL', 'All priorities'],
              ['HIGH', 'High'],
              ['MEDIUM', 'Medium'],
              ['LOW', 'Low'],
            ]}
          />
          <FilterSelect
            value={filters.assigneeId}
            onChange={(v) => setFilters({ assigneeId: v })}
            options={[
              ['ALL', 'Anyone'],
              ...members.map((m) => [m.id, m.displayName] as [string, string]),
            ]}
          />
          {isLoading ? (
            <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {error ? (
          <div className="border-b border-rose-100 bg-rose-50 px-6 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <TaskTable
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelect={setSelectedTask}
          onToggleDone={handleToggleDone}
          onEdit={(task) => setEditingTask(task)}
          onDelete={handleDelete}
        />
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

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: [string, string][]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm text-foreground outline-none hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {options.map(([val, label]) => (
        <option key={val} value={val}>
          {label}
        </option>
      ))}
    </select>
  )
}
