export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type TaskSourceType =
  | 'MANUAL'
  | 'CHAT'
  | 'WIKI'
  | 'EMAIL'
  | 'CALENDAR'
  | 'DOCUMENT'
  | 'AI'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string | null
  assigneeName: string | null
  dueDate: string | null
  sourceType: TaskSourceType
  sourceId: string | null
  sourceTitle: string | null
  createdBy: string
  createdByName: string | null
  createdByAi: boolean
  aiReason: string | null
  createdAt: string
  updatedAt: string
}

export interface ListTasksFilters {
  status?: TaskStatus
  assigneeId?: string
  priority?: TaskPriority
  sourceType?: TaskSourceType
  createdByAi?: boolean
  mine?: boolean
  dueBefore?: string
  search?: string
}

export interface ListTasksResponse {
  tasks: Task[]
}

export interface CreateTaskInput {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
  sourceType?: TaskSourceType
  sourceId?: string | null
  sourceTitle?: string | null
  createdByAi?: boolean
  aiReason?: string | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
}

export interface DeleteTaskResponse {
  success: boolean
}

export interface ProposedTask {
  title: string
  description: string | null
  assigneeName: string | null
  dueDate: string | null
  priority: TaskPriority
  reason: string
}

export interface ExtractTasksInput {
  authContext: {
    orgId: string
    userId: string
    role?: string
    displayName?: string
    email?: string
    orgName?: string
    orgSlug?: string
  }
  conversationContext: { role: string; content: string }[]
  sourceTitle?: string
}

export interface ExtractTasksResponse {
  proposedTasks: ProposedTask[]
}
