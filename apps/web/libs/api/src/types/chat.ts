export type ChatConversationType = 'PUBLIC_CHANNEL' | 'PRIVATE_CHANNEL' | 'DM'
export type ChatAttachmentKind = 'FILE' | 'GIF'

export type ChatUser = {
  id: string
  email?: string
  displayName: string
}

export type ChatConversationMember = {
  id: string
  userId: string
  joinedAt: string
  user: ChatUser
}

export type ChatAttachment = {
  id: string
  messageId: string
  kind: ChatAttachmentKind
  url: string
  name: string
  mimeType?: string | null
  size?: number | null
  provider?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export type ChatReaction = {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: string
  user?: Pick<ChatUser, 'id' | 'displayName'>
}

export type ChatMessage = {
  id: string
  conversationId: string
  authorId: string
  parentId?: string | null
  content: string
  createdAt: string
  updatedAt: string
  author: ChatUser
  attachments: ChatAttachment[]
  reactions: ChatReaction[]
  replies?: Array<{ id: string }>
}

export type ChatConversation = {
  id: string
  orgId: string
  type: ChatConversationType
  name?: string | null
  slug?: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  members: ChatConversationMember[]
  lastMessage?: ChatMessage | null
}

export type ChatAttachmentInput = {
  kind: ChatAttachmentKind
  url: string
  name: string
  mimeType?: string
  size?: number
  provider?: string
  metadata?: Record<string, unknown>
}

export type CreateChannelInput = {
  name: string
  type: Exclude<ChatConversationType, 'DM'>
  memberIds?: string[]
}

export type CreateDmInput = {
  memberIds: string[]
}

export type CreateMessageInput = {
  content: string
  parentId?: string
  attachments?: ChatAttachmentInput[]
}

export type ListConversationsResponse = {
  conversations: ChatConversation[]
  nextCursor?: string | null
}

export type ListMessagesResponse = {
  messages: ChatMessage[]
  nextCursor?: string | null
}

export type CreateMessageResponse = {
  message: ChatMessage
}

export type AddReactionResponse = {
  reaction: ChatReaction
}

export type ListQuery = {
  limit?: number
  cursor?: string
}

export type RealtimeEventTarget = {
  orgId: string
  userId?: string
  conversationId?: string
}

type ChatRealtimeEventBase = {
  domain?: 'chat'
  event?: 'message.created' | 'reaction.added' | 'reaction.removed'
  schemaVersion?: number
  eventId?: string
  timestamp?: string
  target?: RealtimeEventTarget
}

export type ChatRealtimeEvent =
  | (ChatRealtimeEventBase & {
      type: 'message.created'
      orgId: string
      conversationId: string
      payload: ChatMessage
    })
  | (ChatRealtimeEventBase & {
      type: 'reaction.added'
      orgId: string
      conversationId: string
      payload: { messageId: string; reaction: ChatReaction }
    })
  | (ChatRealtimeEventBase & {
      type: 'reaction.removed'
      orgId: string
      conversationId: string
      payload: { messageId: string; userId: string; emoji: string }
    })
