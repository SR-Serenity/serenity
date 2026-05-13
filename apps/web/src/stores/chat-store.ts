'use client'

import { create } from 'zustand'
import { chatApi } from '@serenity/api'
import type {
  ChatConversation,
  ChatMessage,
  ChatRealtimeEvent,
  CreateChannelInput,
  CreateDmInput,
} from '@serenity/api'

type ChatState = {
  activeConversationId: string | null
  conversations: ChatConversation[]
  messages: ChatMessage[]
  hasMoreMessages: boolean
  nextCursor: string | null
  isLoadingConversations: boolean
  isLoadingMessages: boolean
  conversationError: string | null
  messageError: string | null
  replyingTo: ChatMessage | null
  threadMessage: ChatMessage | null
}

type ChatActions = {
  reset: () => void
  setActiveConversation: (conversationId: string | null) => void
  setReplyingTo: (message: ChatMessage | null) => void
  setThreadMessage: (message: ChatMessage | null) => void
  loadConversations: (token: string | null, shouldLoad?: boolean) => Promise<void>
  loadMessages: (token: string | null, conversationId: string, cursor?: string) => Promise<void>
  createMessage: (
    token: string,
    conversationId: string,
    input: { content: string; parentId?: string; attachmentIds: string[] },
  ) => Promise<void>
  editMessage: (token: string, messageId: string, content: string) => Promise<void>
  unsendMessage: (token: string, messageId: string) => Promise<void>
  deleteMessageForMe: (token: string, messageId: string) => Promise<void>
  createChannel: (token: string, input: CreateChannelInput) => Promise<ChatConversation>
  createDm: (token: string, input: CreateDmInput) => Promise<ChatConversation>
  applyRealtimeEvent: (event: ChatRealtimeEvent) => void
}

export type ChatStore = ChatState & ChatActions

const initialChatState: ChatState = {
  activeConversationId: null,
  conversations: [],
  messages: [],
  hasMoreMessages: false,
  nextCursor: null,
  isLoadingConversations: false,
  isLoadingMessages: false,
  conversationError: null,
  messageError: null,
  replyingTo: null,
  threadMessage: null,
}

function upsertMessage(messages: ChatMessage[], nextMessage: ChatMessage) {
  if (messages.some(message => message.id === nextMessage.id)) {
    return messages.map(message => (message.id === nextMessage.id ? nextMessage : message))
  }
  return [...messages, nextMessage]
}

function updateReaction(
  messages: ChatMessage[],
  messageId: string,
  update: (message: ChatMessage) => ChatMessage,
) {
  return messages.map(message => (message.id === messageId ? update(message) : message))
}

function upsertConversation(
  conversations: ChatConversation[],
  nextConversation: ChatConversation,
) {
  return [
    nextConversation,
    ...conversations.filter(conversation => conversation.id !== nextConversation.id),
  ]
}

function updateConversationLastMessage(
  conversations: ChatConversation[],
  conversationId: string,
  message: ChatMessage,
) {
  return conversations.map(conversation =>
    conversation.id === conversationId
      ? { ...conversation, lastMessage: message, updatedAt: message.createdAt }
      : conversation,
  )
}

function updateLastMessageById(
  conversations: ChatConversation[],
  messageId: string,
  message: ChatMessage,
) {
  return conversations.map(conversation =>
    conversation.lastMessage?.id === messageId
      ? { ...conversation, lastMessage: message }
      : conversation,
  )
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  ...initialChatState,

  reset: () => set(initialChatState),

  setActiveConversation: (conversationId) => {
    const currentConversationId = get().activeConversationId
    if (currentConversationId === conversationId) return

    set({
      activeConversationId: conversationId,
      messages: [],
      hasMoreMessages: false,
      nextCursor: null,
      messageError: null,
      replyingTo: null,
      threadMessage: null,
    })
  },

  setReplyingTo: (replyingTo) => set({ replyingTo }),
  setThreadMessage: (threadMessage) => set({ threadMessage }),

  loadConversations: async (token, shouldLoad = true) => {
    if (!token || !shouldLoad) {
      set({
        conversations: [],
        isLoadingConversations: false,
        conversationError: null,
      })
      return
    }

    set({ isLoadingConversations: true, conversationError: null })
    try {
      const response = await chatApi.listConversations(token)
      set({ conversations: response.conversations })
    } catch (error) {
      set({
        conversations: [],
        conversationError:
          error instanceof Error ? error.message : 'Failed to load conversations',
      })
    } finally {
      set({ isLoadingConversations: false })
    }
  },

  loadMessages: async (token, conversationId, cursor) => {
    if (!token) return

    set({ isLoadingMessages: true, messageError: null })
    try {
      const response = await chatApi.listMessages(token, conversationId, undefined, {
        limit: 50,
        cursor,
      })
      set(state => ({
        messages: cursor ? [...response.messages, ...state.messages] : response.messages,
        hasMoreMessages: Boolean(response.nextCursor),
        nextCursor: response.nextCursor ?? null,
      }))
    } catch (error) {
      set({
        messageError: error instanceof Error ? error.message : 'Failed to load messages',
      })
    } finally {
      set({ isLoadingMessages: false })
    }
  },

  createMessage: async (token, conversationId, input) => {
    const response = await chatApi.createMessage(token, conversationId, input)
    const nextMessage = response.message

    set(state => ({
      messages: nextMessage.parentId ? state.messages : upsertMessage(state.messages, nextMessage),
      conversations: updateConversationLastMessage(
        state.conversations,
        conversationId,
        nextMessage,
      ),
      replyingTo: null,
    }))
  },

  editMessage: async (token, messageId, content) => {
    const response = await chatApi.editMessage(token, messageId, content)
    set(state => ({
      messages: upsertMessage(state.messages, response.message),
      conversations: updateLastMessageById(state.conversations, messageId, response.message),
    }))
  },

  unsendMessage: async (token, messageId) => {
    const response = await chatApi.unsendMessage(token, messageId)
    set(state => ({
      messages: upsertMessage(state.messages, response.message),
      conversations: updateLastMessageById(state.conversations, messageId, response.message),
    }))
  },

  deleteMessageForMe: async (token, messageId) => {
    await chatApi.deleteMessageForMe(token, messageId)
    set(state => ({
      messages: state.messages.filter(message => message.id !== messageId),
    }))
  },

  createChannel: async (token, input) => {
    const conversation = await chatApi.createChannel(token, input)
    set(state => ({
      conversations: upsertConversation(state.conversations, conversation),
    }))
    return conversation
  },

  createDm: async (token, input) => {
    const conversation = await chatApi.createDm(token, input)
    set(state => ({
      conversations: upsertConversation(state.conversations, conversation),
    }))
    return conversation
  },

  applyRealtimeEvent: (event) => {
    switch (event.type) {
      case 'message.created': {
        set(state => ({
          conversations: updateConversationLastMessage(
            state.conversations,
            event.conversationId,
            event.payload,
          ),
          messages:
            event.conversationId === state.activeConversationId && !event.payload.parentId
              ? upsertMessage(state.messages, event.payload)
              : state.messages,
        }))
        return
      }

      case 'message.edited':
      case 'message.unsent': {
        set(state => ({
          messages:
            event.conversationId === state.activeConversationId
              ? upsertMessage(state.messages, event.payload)
              : state.messages,
          conversations: updateLastMessageById(
            state.conversations,
            event.payload.id,
            event.payload,
          ),
        }))
        return
      }

      case 'reaction.added': {
        set(state => ({
          messages: updateReaction(state.messages, event.payload.messageId, message => ({
            ...message,
            reactions: message.reactions.some(item => item.id === event.payload.reaction.id)
              ? message.reactions
              : [...message.reactions, event.payload.reaction],
          })),
        }))
        return
      }

      case 'reaction.removed': {
        set(state => ({
          messages: updateReaction(state.messages, event.payload.messageId, message => ({
            ...message,
            reactions: message.reactions.filter(
              reaction =>
                !(
                  reaction.userId === event.payload.userId &&
                  reaction.emoji === event.payload.emoji
                ),
            ),
          })),
        }))
      }
    }
  },
}))
