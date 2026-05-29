import { api } from './client'
import type {
  AddReactionResponse,
  AddConversationMembersInput,
  ChatConversation,
  ChatMessageResponse,
  CompleteAttachmentUploadInput,
  CompleteAttachmentUploadResponse,
  CreateAttachmentUploadIntentInput,
  CreateAttachmentUploadIntentResponse,
  CreateChannelInput,
  CreateDmInput,
  CreateMessageInput,
  CreateMessageResponse,
  DeleteMessageResponse,
  ListPage,
  ListConversationAssetsInput,
  ListConversationAssetsResponse,
  ListConversationsResponse,
  ListMessagesResponse,
  ChatAiRequest,
  ChatAiResponse,
} from '../types/chat'

export const chatApi = {
  assistWithAi: async (token: string, input: ChatAiRequest): Promise<ChatAiResponse> => {
    return api.post('ai/chat/assist', {
      token,
      body: input,
    })
  },
  listConversations: async (
    token: string,
    page?: ListPage,
  ): Promise<ListConversationsResponse> => {
    return api.post('chat/conversations/list', { token, body: page ?? {} })
  },

  createChannel: async (token: string, input: CreateChannelInput): Promise<ChatConversation> => {
    return api.post('chat/channels', {
      token,
      body: input,
    })
  },

  createDm: async (token: string, input: CreateDmInput): Promise<ChatConversation> => {
    return api.post('chat/dms', {
      token,
      body: input,
    })
  },

  addConversationMembers: async (
    token: string,
    conversationId: string,
    input: AddConversationMembersInput,
  ): Promise<ChatConversation> => {
    return api.post(`chat/conversations/${conversationId}/members`, {
      token,
      body: input,
    })
  },

  listConversationAssets: async (
    token: string,
    conversationId: string,
    input?: ListConversationAssetsInput,
  ): Promise<ListConversationAssetsResponse> => {
    return api.post(`chat/conversations/${conversationId}/assets/list`, {
      token,
      body: input ?? {},
    })
  },

  listMessages: async (
    token: string,
    conversationId: string,
    parentId?: string,
    page?: ListPage,
  ): Promise<ListMessagesResponse> => {
    return api.post(`chat/conversations/${conversationId}/messages/list`, {
      token,
      body: { parentId, ...page },
    })
  },

  createMessage: async (
    token: string,
    conversationId: string,
    input: CreateMessageInput
  ): Promise<CreateMessageResponse> => {
    return api.post(`chat/conversations/${conversationId}/messages`, {
      token,
      body: input,
    })
  },

  editMessage: async (
    token: string,
    messageId: string,
    content: string
  ): Promise<ChatMessageResponse> => {
    return api.patch(`chat/messages/${messageId}`, {
      token,
      body: { content },
    })
  },

  unsendMessage: async (token: string, messageId: string): Promise<ChatMessageResponse> => {
    return api.post(`chat/messages/${messageId}/unsend`, {
      token,
    })
  },

  deleteMessageForMe: async (token: string, messageId: string): Promise<DeleteMessageResponse> => {
    return api.delete(`chat/messages/${messageId}`, {
      token,
    })
  },

  createUploadIntent: async (
    token: string,
    input: CreateAttachmentUploadIntentInput
  ): Promise<CreateAttachmentUploadIntentResponse> => {
    return api.post('chat/attachments/upload-intent', {
      token,
      body: input,
    })
  },

  completeAttachmentUpload: async (
    token: string,
    attachmentId: string,
    input: CompleteAttachmentUploadInput
  ): Promise<CompleteAttachmentUploadResponse> => {
    return api.post(`chat/attachments/${attachmentId}/complete`, {
      token,
      body: input,
    })
  },

  addReaction: async (
    token: string,
    messageId: string,
    emoji: string
  ): Promise<AddReactionResponse> => {
    return api.post(`chat/messages/${messageId}/reactions`, {
      token,
      body: { emoji },
    })
  },

  removeReaction: async (token: string, messageId: string, emoji: string) => {
    return api.delete(`chat/messages/${messageId}/reactions`, {
      token,
      body: { emoji },
    })
  },
}
