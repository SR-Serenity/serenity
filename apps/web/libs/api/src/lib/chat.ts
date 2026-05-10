import { request } from './client'
import type {
  AddReactionResponse,
  ChatConversation,
  CreateChannelInput,
  CreateDmInput,
  CreateMessageInput,
  CreateMessageResponse,
  ListQuery,
  ListConversationsResponse,
  ListMessagesResponse,
} from '../types/chat'

function listQueryString(query?: ListQuery) {
  if (!query) {
    return ''
  }
  const params = new URLSearchParams()
  if (typeof query.limit === 'number') {
    params.set('limit', String(query.limit))
  }
  if (query.cursor) {
    params.set('cursor', query.cursor)
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

export const chatApi = {
  listConversations: async (
    token: string,
    query?: ListQuery,
  ): Promise<ListConversationsResponse> => {
    return request(`chat/conversations${listQueryString(query)}`, { token, method: 'GET' })
  },

  createChannel: async (token: string, input: CreateChannelInput): Promise<ChatConversation> => {
    return request('chat/channels', {
      token,
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  createDm: async (token: string, input: CreateDmInput): Promise<ChatConversation> => {
    return request('chat/dms', {
      token,
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  listMessages: async (
    token: string,
    conversationId: string,
    parentId?: string,
    query?: ListQuery,
  ): Promise<ListMessagesResponse> => {
    const params = new URLSearchParams()
    if (parentId) {
      params.set('parentId', parentId)
    }
    if (typeof query?.limit === 'number') {
      params.set('limit', String(query.limit))
    }
    if (query?.cursor) {
      params.set('cursor', query.cursor)
    }
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request(`chat/conversations/${conversationId}/messages${suffix}`, {
      token,
      method: 'GET',
    })
  },

  createMessage: async (
    token: string,
    conversationId: string,
    input: CreateMessageInput
  ): Promise<CreateMessageResponse> => {
    return request(`chat/conversations/${conversationId}/messages`, {
      token,
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  addReaction: async (
    token: string,
    messageId: string,
    emoji: string
  ): Promise<AddReactionResponse> => {
    return request(`chat/messages/${messageId}/reactions`, {
      token,
      method: 'POST',
      body: JSON.stringify({ emoji }),
    })
  },

  removeReaction: async (token: string, messageId: string, emoji: string) => {
    return request(`chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
      token,
      method: 'DELETE',
    })
  },
}
