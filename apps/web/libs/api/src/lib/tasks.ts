import { api } from './client'
import type {
  CreateTaskInput,
  DeleteTaskResponse,
  ListTasksFilters,
  ListTasksResponse,
  Task,
  UpdateTaskInput,
} from '../types/tasks'

function queryString(filters: ListTasksFilters = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const tasksApi = {
  listTasks: async (
    token: string,
    filters?: ListTasksFilters,
  ): Promise<ListTasksResponse> => {
    return api.get(`tasks${queryString(filters)}`, { token })
  },

  getTask: async (token: string, taskId: string): Promise<Task> => {
    return api.get(`tasks/${taskId}`, { token })
  },

  createTask: async (token: string, input: CreateTaskInput): Promise<Task> => {
    return api.post('tasks', { token, body: input })
  },

  updateTask: async (
    token: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<Task> => {
    return api.patch(`tasks/${taskId}`, { token, body: input })
  },

  deleteTask: async (
    token: string,
    taskId: string,
  ): Promise<DeleteTaskResponse> => {
    return api.delete(`tasks/${taskId}`, { token })
  },
}
