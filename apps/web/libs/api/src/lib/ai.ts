import { api } from './client'
import type {
  AiChatRequest,
  AiChatResponse,
  AiFileAskRequest,
  AiFileAskResponse,
  AiFileIndexRequest,
  AiFileIndexResponse,
  AiSession,
  AiSessionMessage,
  AiSessionSummary,
} from '../types/ai'

export const aiApi = {
  chat: async (token: string, input: AiChatRequest): Promise<AiChatResponse> => {
    return api.post('ai/chat', { token, body: input })
  },

  indexFile: async (token: string, input: AiFileIndexRequest): Promise<AiFileIndexResponse> => {
    return api.post('ai/files/index', { token, body: input })
  },

  askFile: async (token: string, input: AiFileAskRequest): Promise<AiFileAskResponse> => {
    return api.post('ai/files/ask', { token, body: input })
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
}
