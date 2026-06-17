import { API_BASE, api } from './client'
import type {
  AiChatRequest,
  AiChatResponse,
  AiChatStreamEvent,
  AiFileAskRequest,
  AiFileAskResponse,
  AiFileIndexRequest,
  AiFileIndexResponse,
  AiSession,
  AiSessionMessage,
  AiSessionSummary,
} from '../types/ai'
import type { ExtractTasksInput, ExtractTasksResponse } from '../types/tasks'

export const aiApi = {
  chat: async (token: string, input: AiChatRequest): Promise<AiChatResponse> => {
    return api.post('ai/chat', { token, body: input })
  },

  streamChat: async (
    token: string,
    input: AiChatRequest,
    handlers: {
      onToken?: (content: string) => void
      onAnswer?: (answer: string) => void
      onEvent?: (event: AiChatStreamEvent) => void
    } = {},
  ): Promise<AiChatResponse> => {
    const response = await fetch(`${API_BASE}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || 'Serenity AI is unavailable.')
    }
    if (!response.body) {
      throw new Error('Streaming is not supported by this browser.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalResponse: AiChatResponse | null = null

    const handleLine = (line: string) => {
      if (!line.trim()) return
      const event = JSON.parse(line) as AiChatStreamEvent
      handlers.onEvent?.(event)
      if (event.type === 'token') {
        handlers.onToken?.(event.content)
      } else if (event.type === 'answer') {
        handlers.onAnswer?.(event.answer)
      } else if (event.type === 'final') {
        finalResponse = {
          answer: event.answer,
          threadId: event.threadId,
          sources: event.sources ?? [],
          proposedActions: event.proposedActions ?? [],
          traceId: event.traceId,
        }
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        handleLine(line)
      }
      if (done) break
    }
    handleLine(buffer)

    if (!finalResponse) {
      throw new Error('Serenity AI stream ended before a final response.')
    }
    return finalResponse
  },

  /**
   * One-shot streaming query — no session persistence.
   * Uses a random ephemeral sessionId so no chat history is saved.
   */
  streamOnce: async (
    token: string,
    input: Omit<AiChatRequest, 'sessionId'>,
    handlers: {
      onToken?: (content: string) => void
      onDone?: (answer: string) => void
    } = {},
  ): Promise<string> => {
    const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ephemeral-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const res = await aiApi.streamChat(token, { sessionId, ...input }, {
      onToken: handlers.onToken,
    })
    handlers.onDone?.(res.answer)
    return res.answer
  },

  indexFile: async (token: string, input: AiFileIndexRequest): Promise<AiFileIndexResponse> => {
    return api.post('ai/files/index', { token, body: input })
  },

  askFile: async (token: string, input: AiFileAskRequest): Promise<AiFileAskResponse> => {
    return api.post('ai/files/ask', { token, body: input })
  },

  extractTasks: async (
    token: string,
    input: ExtractTasksInput,
  ): Promise<ExtractTasksResponse> => {
    return api.post('ai/tasks/extract', { token, body: input })
  },

  listSessions: async (token: string): Promise<{ sessions: AiSessionSummary[] }> => {
    return api.get('ai/sessions', { token })
  },

  createSession: async (token: string, title: string): Promise<AiSession> => {
    return api.post('ai/sessions', { token, body: { title } })
  },

  getSession: async (token: string, sessionId: string): Promise<AiSession> => {
    return api.get(`ai/sessions/${sessionId}`, { token })
  },

  updateSession: async (token: string, sessionId: string, title: string): Promise<AiSession> => {
    return api.patch(`ai/sessions/${sessionId}`, { token, body: { title } })
  },

  deleteSession: async (token: string, sessionId: string): Promise<{ success: boolean }> => {
    return api.delete(`ai/sessions/${sessionId}`, { token })
  },

  appendMessages: async (
    token: string,
    sessionId: string,
    messages: { role: 'user' | 'assistant'; content: string; sources?: unknown; proposedActions?: unknown }[],
  ): Promise<{ messages: AiSessionMessage[] }> => {
    return api.post(`ai/sessions/${sessionId}/messages`, { token, body: { messages } })
  },

  updateMessage: async (
    token: string,
    sessionId: string,
    messageId: string,
    patch: { proposedActions?: unknown },
  ): Promise<AiSessionMessage> => {
    return api.patch(`ai/sessions/${sessionId}/messages/${messageId}`, { token, body: patch })
  },
}
