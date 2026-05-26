import { api, client } from './client'
import type {
  ForwardMailInput,
  ListMailAccountsResponse,
  ListMailThreadsInput,
  ListMailThreadsResponse,
  MailActionResponse,
  MailConnectResponse,
  MailThreadDetail,
  ReplyMailInput,
  SendMailInput,
} from '../types/mail'

function queryString(input: ListMailThreadsInput = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const mailApi = {
  listAccounts: async (token: string): Promise<ListMailAccountsResponse> => {
    return api.get('mail/accounts', { token })
  },

  connectGoogle: async (token: string, returnTo?: string): Promise<MailConnectResponse> => {
    return api.post('mail/google/connect', { token, body: { returnTo } })
  },

  disconnectAccount: async (token: string, accountId: string): Promise<MailActionResponse> => {
    return api.delete(`mail/accounts/${accountId}`, { token })
  },

  listThreads: async (
    token: string,
    input?: ListMailThreadsInput,
  ): Promise<ListMailThreadsResponse> => {
    return api.get(`mail/threads${queryString(input)}`, { token })
  },

  getThread: async (token: string, threadId: string): Promise<MailThreadDetail> => {
    return api.get(`mail/threads/${threadId}`, { token })
  },

  downloadAttachment: async (token: string, attachmentId: string): Promise<Blob> => {
    const response = await client.get(`mail/attachments/${attachmentId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    })
    return response.data as Blob
  },

  send: async (token: string, input: SendMailInput): Promise<MailActionResponse> => {
    return api.post('mail/messages/send', { token, body: input })
  },

  reply: async (
    token: string,
    threadId: string,
    input: ReplyMailInput,
  ): Promise<MailActionResponse> => {
    return api.post(`mail/threads/${threadId}/reply`, { token, body: input })
  },

  forward: async (
    token: string,
    threadId: string,
    input: ForwardMailInput,
  ): Promise<MailActionResponse> => {
    return api.post(`mail/threads/${threadId}/forward`, { token, body: input })
  },

  action: async (
    token: string,
    threadId: string,
    action: 'read' | 'unread' | 'star' | 'unstar' | 'archive' | 'trash' | 'restore',
  ): Promise<MailActionResponse> => {
    return api.post(`mail/threads/${threadId}/${action}`, { token, body: {} })
  },
}
