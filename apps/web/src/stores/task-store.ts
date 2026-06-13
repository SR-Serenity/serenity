'use client'

import { create } from 'zustand'
import { tasksApi } from '@serenity/api'
import type {
  CreateTaskInput,
  ListTasksFilters,
  Task,
  UpdateTaskInput,
} from '@serenity/api'
import { useAuthStore } from './auth-store'

export type TaskTab = 'all' | 'mine' | 'ai' | 'overdue' | 'completed'

export type TaskFilters = {
  search: string
  status: Task['status'] | 'ALL'
  priority: Task['priority'] | 'ALL'
  assigneeId: string | 'ALL'
  sourceType: Task['sourceType'] | 'ALL'
}

type TaskState = {
  tasks: Task[]
  selectedTaskId: string | null
  activeTab: TaskTab
  filters: TaskFilters
  isLoading: boolean
  error: string | null
}

type TaskActions = {
  reset: () => void
  setTab: (tab: TaskTab) => void
  setFilters: (filters: Partial<TaskFilters>) => void
  setSelectedTask: (taskId: string | null) => void
  loadTasks: (token: string | null) => Promise<void>
  createTask: (token: string, input: CreateTaskInput) => Promise<Task>
  updateTask: (token: string, taskId: string, input: UpdateTaskInput) => Promise<Task>
  deleteTask: (token: string, taskId: string) => Promise<void>
}

export type TaskStore = TaskState & TaskActions

const initialFilters: TaskFilters = {
  search: '',
  status: 'ALL',
  priority: 'ALL',
  assigneeId: 'ALL',
  sourceType: 'ALL',
}

const initialState: TaskState = {
  tasks: [],
  selectedTaskId: null,
  activeTab: 'all',
  filters: initialFilters,
  isLoading: false,
  error: null,
}

function buildQuery(state: TaskState, currentUserId?: string): ListTasksFilters {
  const { filters, activeTab } = state
  const query: ListTasksFilters = {}

  if (filters.search.trim()) query.search = filters.search.trim()
  if (filters.status !== 'ALL') query.status = filters.status
  if (filters.priority !== 'ALL') query.priority = filters.priority
  if (filters.assigneeId !== 'ALL') query.assigneeId = filters.assigneeId
  if (filters.sourceType !== 'ALL') query.sourceType = filters.sourceType

  // Tabs narrow the result set further (server-side where possible).
  if (activeTab === 'mine' && currentUserId) query.assigneeId = currentUserId
  if (activeTab === 'ai') query.createdByAi = true
  if (activeTab === 'completed') query.status = 'DONE'
  if (activeTab === 'overdue') query.dueBefore = new Date().toISOString()

  return query
}

export const useTaskStore = create<TaskStore>()((set, get) => ({
  ...initialState,

  reset: () => set({ ...initialState }),

  setTab: (tab) => set({ activeTab: tab }),

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  setSelectedTask: (taskId) => set({ selectedTaskId: taskId }),

  loadTasks: async (token) => {
    if (!token) return
    set({ isLoading: true, error: null })
    try {
      const currentUserId = useAuthStore.getState().user?.id
      const query = buildQuery(get(), currentUserId)
      const { tasks } = await tasksApi.listTasks(token, query)
      // The "overdue" tab additionally excludes completed/cancelled tasks.
      const filtered =
        get().activeTab === 'overdue'
          ? tasks.filter(
              (t) => t.dueDate && t.status !== 'DONE' && t.status !== 'CANCELLED',
            )
          : tasks
      set({ tasks: filtered, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load tasks',
        isLoading: false,
      })
    }
  },

  createTask: async (token, input) => {
    const task = await tasksApi.createTask(token, input)
    await get().loadTasks(token)
    return task
  },

  updateTask: async (token, taskId, input) => {
    const task = await tasksApi.updateTask(token, taskId, input)
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
    }))
    return task
  },

  deleteTask: async (token, taskId) => {
    await tasksApi.deleteTask(token, taskId)
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
    }))
  },
}))
