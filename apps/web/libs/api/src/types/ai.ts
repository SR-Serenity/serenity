export type AiChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

export type AiAuthContext = {
  orgId: string
  userId: string
  role?: string | null
  displayName?: string | null
  email?: string | null
  orgName?: string | null
  orgSlug?: string | null
}

export type AiRequestContext = {
  conversationId?: string
  wikiPageId?: string
  meetingId?: string
  fileIds?: string[]
  selectedText?: string
  entrypoint?: string
  timeZone?: string
}

export type AiSource = {
  type: string
  fileId?: string | null
  page?: number | null
  title?: string | null
  url?: string | null
  snippet?: string | null
}

export type AiProposedActionType =
  | 'CREATE_TASK'
  | 'CREATE_EVENT'
  | 'CREATE_MEETING'
  | 'BOOK_ROOM'
  | 'UPDATE_CALENDAR_ITEM'
  | 'CREATE_WIKI_PAGE'
  | 'EDIT_WIKI_PAGE'

export type AiProposedAction = {
  type: AiProposedActionType
  payload: Record<string, unknown>
  confidence: number
  requiresConfirmation: boolean
  status?: 'confirmed' | 'rejected' | 'superseded'
  isRefinement?: boolean
}

export type AiChatRequest = {
  sessionId: string
  messages: AiChatMessage[]
  authContext: AiAuthContext
  context?: AiRequestContext
}

export type AiChatResponse = {
  answer: string
  threadId: string
  sources: AiSource[]
  proposedActions: AiProposedAction[]
  traceId?: string | null
}

export type AiFileMetadata = {
  fileId: string
  sourceUrl?: string | null
  title?: string | null
  mimeType?: string | null
}

export type AiFileIndexRequest = {
  authContext: AiAuthContext
  file: AiFileMetadata
  text?: string | null
  pages?: string[] | null
}

export type AiFileIndexResponse = {
  fileId: string
  chunksIndexed: number
  traceId?: string | null
}

export type AiFileAskRequest = {
  authContext: AiAuthContext
  fileIds: string[]
  question: string
  sessionId?: string | null
  context?: AiRequestContext
}

export type AiFileAskResponse = {
  answer: string
  sources: AiSource[]
  traceId?: string | null
}

export type AiSessionMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: AiSource[] | null
  proposedActions?: AiProposedAction[] | null
  createdAt: string
}

export type AiSession = {
  id: string
  title: string
  orgId: string
  userId: string
  messages: AiSessionMessage[]
  createdAt: string
  updatedAt: string
}

export type AiSessionSummary = {
  id: string
  title: string
  orgId: string
  userId: string
  preview: string | null
  createdAt: string
  updatedAt: string
}
