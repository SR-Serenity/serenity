'use client'

import { create } from 'zustand'
import { chatApi } from '@serenity/api'
import { useAuthStore } from './auth-store'
import type {
  ChatConversation,
  ChatMessage,
  ChatReaction,
  ChatRealtimeEvent,
  ChatUser,
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
  ) => Promise<ChatMessage>
  editMessage: (token: string, messageId: string, content: string) => Promise<void>
  unsendMessage: (token: string, messageId: string) => Promise<void>
  deleteMessageForMe: (token: string, messageId: string) => Promise<void>
  addReaction: (token: string, messageId: string, emoji: string) => Promise<void>
  removeReaction: (token: string, messageId: string, emoji: string) => Promise<void>
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

const optimisticIdPrefix = 'optimistic'

function createOptimisticId(scope: string) {
  return `${optimisticIdPrefix}-${scope}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getCurrentChatUser(): ChatUser | null {
  const user = useAuthStore.getState().user
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  }
}

function upsertMessage(messages: ChatMessage[], nextMessage: ChatMessage) {
  if (messages.some(message => message.id === nextMessage.id)) {
    return messages.map(message => (message.id === nextMessage.id ? nextMessage : message))
  }
  return [...messages, nextMessage]
}

function replaceOptimisticMessage(
  messages: ChatMessage[],
  optimisticId: string,
  nextMessage: ChatMessage,
) {
  let replaced = false
  const withoutDuplicate = messages.filter(message => message.id !== nextMessage.id)
  const nextMessages = withoutDuplicate.map(message => {
    if (message.id !== optimisticId) return message
    replaced = true
    return nextMessage
  })

  return replaced ? nextMessages : upsertMessage(nextMessages, nextMessage)
}

function restoreMessageAt(
  messages: ChatMessage[],
  message: ChatMessage,
  index: number,
) {
  if (messages.some(item => item.id === message.id)) return messages

  const nextMessages = [...messages]
  nextMessages.splice(Math.max(index, 0), 0, message)
  return nextMessages
}

function updateReaction(
  messages: ChatMessage[],
  messageId: string,
  update: (message: ChatMessage) => ChatMessage,
) {
  return messages.map(message => (message.id === messageId ? update(message) : message))
}

function addReplyReference(messages: ChatMessage[], parentId: string, replyId: string) {
  return messages.map(message => {
    if (message.id !== parentId) return message

    const replies = message.replies ?? []
    if (replies.some(reply => reply.id === replyId)) return message

    return {
      ...message,
      replies: [...replies, { id: replyId }],
    }
  })
}

function removeReplyReference(messages: ChatMessage[], parentId: string, replyId: string) {
  return messages.map(message =>
    message.id === parentId
      ? {
          ...message,
          replies: message.replies?.filter(reply => reply.id !== replyId) ?? [],
        }
      : message,
  )
}

function replaceReplyReference(
  messages: ChatMessage[],
  parentId: string,
  previousReplyId: string,
  nextReplyId: string,
) {
  return messages.map(message => {
    if (message.id !== parentId) return message

    const replies = message.replies ?? []
    if (replies.some(reply => reply.id === nextReplyId)) {
      return {
        ...message,
        replies: replies.filter(reply => reply.id !== previousReplyId),
      }
    }

    return {
      ...message,
      replies: replies.map(reply =>
        reply.id === previousReplyId ? { id: nextReplyId } : reply,
      ),
    }
  })
}

function updateThreadMessageReplyReference(
  threadMessage: ChatMessage | null,
  parentId: string,
  update: (messages: ChatMessage[]) => ChatMessage[],
) {
  if (!threadMessage || threadMessage.id !== parentId) return threadMessage
  return update([threadMessage])[0] ?? threadMessage
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

function rollbackConversationLastMessage(
  conversations: ChatConversation[],
  conversationId: string,
  optimisticMessageId: string,
  previousLastMessage: ChatMessage | null | undefined,
  previousUpdatedAt: string | undefined,
) {
  return conversations.map(conversation =>
    conversation.id === conversationId && conversation.lastMessage?.id === optimisticMessageId
      ? {
          ...conversation,
          lastMessage: previousLastMessage ?? null,
          updatedAt: previousUpdatedAt ?? conversation.updatedAt,
        }
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

function replaceReaction(
  reactions: ChatReaction[],
  optimisticReactionId: string,
  nextReaction: ChatReaction,
) {
  const withoutDuplicate = reactions.filter(
    reaction => reaction.id !== optimisticReactionId && reaction.id !== nextReaction.id,
  )

  if (
    withoutDuplicate.some(
      reaction =>
        reaction.userId === nextReaction.userId && reaction.emoji === nextReaction.emoji,
    )
  ) {
    return withoutDuplicate
  }

  return [...withoutDuplicate, nextReaction]
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
    const author = getCurrentChatUser()
    const parentId = input.parentId ?? null
    const createdAt = new Date().toISOString()
    const optimisticMessageId = author ? createOptimisticId('message') : null
    const previousConversation = get().conversations.find(
      conversation => conversation.id === conversationId,
    )

    if (author && optimisticMessageId) {
      const optimisticMessage: ChatMessage = {
        id: optimisticMessageId,
        conversationId,
        authorId: author.id,
        parentId,
        content: input.content,
        createdAt,
        updatedAt: createdAt,
        editedAt: null,
        unsentAt: null,
        author,
        attachments: [],
        reactions: [],
      }

      set(state => ({
        messages: parentId
          ? addReplyReference(state.messages, parentId, optimisticMessage.id)
          : upsertMessage(state.messages, optimisticMessage),
        conversations: updateConversationLastMessage(
          state.conversations,
          conversationId,
          optimisticMessage,
        ),
        threadMessage: parentId
          ? updateThreadMessageReplyReference(
              state.threadMessage,
              parentId,
              messages => addReplyReference(messages, parentId, optimisticMessage.id),
            )
          : state.threadMessage,
        replyingTo: null,
        messageError: null,
      }))
    }

    try {
      const response = await chatApi.createMessage(token, conversationId, input)
      const nextMessage = response.message
      const nextParentId = nextMessage.parentId ?? null

      set(state => ({
        messages: nextParentId
          ? optimisticMessageId
            ? replaceReplyReference(
                state.messages,
                nextParentId,
                optimisticMessageId,
                nextMessage.id,
              )
            : addReplyReference(state.messages, nextParentId, nextMessage.id)
          : optimisticMessageId
            ? replaceOptimisticMessage(state.messages, optimisticMessageId, nextMessage)
            : upsertMessage(state.messages, nextMessage),
        conversations: updateConversationLastMessage(
          state.conversations,
          conversationId,
          nextMessage,
        ),
        threadMessage: nextParentId
          ? updateThreadMessageReplyReference(
              state.threadMessage,
              nextParentId,
              messages =>
                optimisticMessageId
                  ? replaceReplyReference(
                      messages,
                      nextParentId,
                      optimisticMessageId,
                      nextMessage.id,
                    )
                  : addReplyReference(messages, nextParentId, nextMessage.id),
            )
          : state.threadMessage,
        replyingTo: null,
        messageError: null,
      }))
      return nextMessage
    } catch (error) {
      if (optimisticMessageId) {
        set(state => ({
          messages: parentId
            ? removeReplyReference(state.messages, parentId, optimisticMessageId)
            : state.messages.filter(message => message.id !== optimisticMessageId),
          conversations: rollbackConversationLastMessage(
            state.conversations,
            conversationId,
            optimisticMessageId,
            previousConversation?.lastMessage,
            previousConversation?.updatedAt,
          ),
          threadMessage: parentId
            ? updateThreadMessageReplyReference(
                state.threadMessage,
                parentId,
                messages => removeReplyReference(messages, parentId, optimisticMessageId),
              )
            : state.threadMessage,
          messageError: error instanceof Error ? error.message : 'Failed to send message',
        }))
      } else {
        set({
          messageError: error instanceof Error ? error.message : 'Failed to send message',
        })
      }
      throw error
    }
  },

  editMessage: async (token, messageId, content) => {
    const previousMessage = get().messages.find(message => message.id === messageId)

    if (previousMessage) {
      const editedAt = new Date().toISOString()
      const optimisticMessage = {
        ...previousMessage,
        content,
        updatedAt: editedAt,
        editedAt,
      }

      set(state => ({
        messages: upsertMessage(state.messages, optimisticMessage),
        conversations: updateLastMessageById(state.conversations, messageId, optimisticMessage),
        messageError: null,
      }))
    }

    try {
      const response = await chatApi.editMessage(token, messageId, content)
      set(state => ({
        messages: upsertMessage(state.messages, response.message),
        conversations: updateLastMessageById(state.conversations, messageId, response.message),
        messageError: null,
      }))
    } catch (error) {
      if (previousMessage) {
        set(state => ({
          messages: upsertMessage(state.messages, previousMessage),
          conversations: updateLastMessageById(state.conversations, messageId, previousMessage),
          messageError: error instanceof Error ? error.message : 'Failed to edit message',
        }))
      } else {
        set({
          messageError: error instanceof Error ? error.message : 'Failed to edit message',
        })
      }
      throw error
    }
  },

  unsendMessage: async (token, messageId) => {
    const previousMessage = get().messages.find(message => message.id === messageId)

    if (previousMessage) {
      const unsentAt = new Date().toISOString()
      const optimisticMessage = {
        ...previousMessage,
        content: '',
        updatedAt: unsentAt,
        unsentAt,
      }

      set(state => ({
        messages: upsertMessage(state.messages, optimisticMessage),
        conversations: updateLastMessageById(state.conversations, messageId, optimisticMessage),
        messageError: null,
      }))
    }

    try {
      const response = await chatApi.unsendMessage(token, messageId)
      set(state => ({
        messages: upsertMessage(state.messages, response.message),
        conversations: updateLastMessageById(state.conversations, messageId, response.message),
        messageError: null,
      }))
    } catch (error) {
      if (previousMessage) {
        set(state => ({
          messages: upsertMessage(state.messages, previousMessage),
          conversations: updateLastMessageById(state.conversations, messageId, previousMessage),
          messageError: error instanceof Error ? error.message : 'Failed to unsend message',
        }))
      } else {
        set({
          messageError: error instanceof Error ? error.message : 'Failed to unsend message',
        })
      }
      throw error
    }
  },

  deleteMessageForMe: async (token, messageId) => {
    const previousMessages = get().messages
    const previousMessageIndex = previousMessages.findIndex(message => message.id === messageId)
    const previousMessage = previousMessageIndex >= 0
      ? previousMessages[previousMessageIndex]
      : null

    if (previousMessage) {
      set(state => ({
        messages: state.messages.filter(message => message.id !== messageId),
        messageError: null,
      }))
    }

    try {
      await chatApi.deleteMessageForMe(token, messageId)
      set({ messageError: null })
    } catch (error) {
      if (previousMessage) {
        set(state => ({
          messages: restoreMessageAt(state.messages, previousMessage, previousMessageIndex),
          messageError: error instanceof Error ? error.message : 'Failed to delete message',
        }))
      } else {
        set({
          messageError: error instanceof Error ? error.message : 'Failed to delete message',
        })
      }
      throw error
    }
  },

  addReaction: async (token, messageId, emoji) => {
    const author = getCurrentChatUser()
    const optimisticReactionId = author ? createOptimisticId('reaction') : null
    const optimisticReaction: ChatReaction | null = author && optimisticReactionId
      ? {
          id: optimisticReactionId,
          messageId,
          userId: author.id,
          emoji,
          createdAt: new Date().toISOString(),
          user: {
            id: author.id,
            displayName: author.displayName,
          },
        }
      : null

    if (optimisticReaction) {
      set(state => ({
        messages: updateReaction(state.messages, messageId, message => ({
          ...message,
          reactions: message.reactions.some(
            reaction => reaction.userId === author?.id && reaction.emoji === emoji,
          )
            ? message.reactions
            : [...message.reactions, optimisticReaction],
        })),
        messageError: null,
      }))
    }

    try {
      const response = await chatApi.addReaction(token, messageId, emoji)
      set(state => ({
        messages: updateReaction(state.messages, messageId, message => ({
          ...message,
          reactions: optimisticReactionId
            ? replaceReaction(message.reactions, optimisticReactionId, response.reaction)
            : replaceReaction(message.reactions, response.reaction.id, response.reaction),
        })),
        messageError: null,
      }))
    } catch (error) {
      if (optimisticReactionId) {
        set(state => ({
          messages: updateReaction(state.messages, messageId, message => ({
            ...message,
            reactions: message.reactions.filter(
              reaction => reaction.id !== optimisticReactionId,
            ),
          })),
          messageError: error instanceof Error ? error.message : 'Failed to add reaction',
        }))
      } else {
        set({
          messageError: error instanceof Error ? error.message : 'Failed to add reaction',
        })
      }
      throw error
    }
  },

  removeReaction: async (token, messageId, emoji) => {
    const author = getCurrentChatUser()
    const previousReaction = author
      ? get()
          .messages.find(message => message.id === messageId)
          ?.reactions.find(
            reaction => reaction.userId === author.id && reaction.emoji === emoji,
          )
      : null

    if (previousReaction) {
      set(state => ({
        messages: updateReaction(state.messages, messageId, message => ({
          ...message,
          reactions: message.reactions.filter(
            reaction =>
              !(reaction.userId === previousReaction.userId && reaction.emoji === emoji),
          ),
        })),
        messageError: null,
      }))
    }

    try {
      await chatApi.removeReaction(token, messageId, emoji)
      set({ messageError: null })
    } catch (error) {
      if (previousReaction) {
        set(state => ({
          messages: updateReaction(state.messages, messageId, message => ({
            ...message,
            reactions: message.reactions.some(reaction => reaction.id === previousReaction.id)
              ? message.reactions
              : [...message.reactions, previousReaction],
          })),
          messageError: error instanceof Error ? error.message : 'Failed to remove reaction',
        }))
      } else {
        set({
          messageError: error instanceof Error ? error.message : 'Failed to remove reaction',
        })
      }
      throw error
    }
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
        const parentId = event.payload.parentId ?? null

        set(state => ({
          conversations: updateConversationLastMessage(
            state.conversations,
            event.conversationId,
            event.payload,
          ),
          messages:
            event.conversationId === state.activeConversationId && !parentId
              ? upsertMessage(state.messages, event.payload)
              : event.conversationId === state.activeConversationId && parentId
                ? addReplyReference(state.messages, parentId, event.payload.id)
                : state.messages,
          threadMessage: parentId
            ? updateThreadMessageReplyReference(
                state.threadMessage,
                parentId,
                messages => addReplyReference(messages, parentId, event.payload.id),
              )
            : state.threadMessage,
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
            reactions: message.reactions.some(
              item =>
                item.id === event.payload.reaction.id ||
                (
                  item.userId === event.payload.reaction.userId &&
                  item.emoji === event.payload.reaction.emoji
                ),
            )
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
