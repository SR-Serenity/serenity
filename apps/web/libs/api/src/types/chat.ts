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
  messageId?: string | null
  kind: ChatAttachmentKind
  uploadStatus?: 'PENDING' | 'COMPLETED' | 'FAILED'
  publicId?: string
  url?: string | null
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

export type ChatReplyTarget = {
  id: string
  authorId: string
  content: string
  unsentAt?: string | null
  author: ChatUser
}

export type ChatMessage = {
  id: string
  conversationId: string
  authorId: string
  parentId?: string | null
  replyToId?: string | null
  content: string
  createdAt: string
  updatedAt: string
  editedAt?: string | null
  unsentAt?: string | null
  author: ChatUser
  replyTo?: ChatReplyTarget | null
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

export type ChatAttachmentDraft = {
  id: string
  name: string
  url?: string | null
  mimeType?: string | null
  size?: number | null
  kind?: ChatAttachmentKind
}

export type CreateChannelInput = {
  name: string
  type: Exclude<ChatConversationType, 'DM'>
  memberIds?: string[]
}

export type CreateDmInput = {
  memberIds: string[]
}

export type AddConversationMembersInput = {
  memberIds: string[]
}

export type CreateMessageInput = {
  content: string
  parentId?: string
  replyToId?: string
  attachmentIds?: string[]
}

export type ListConversationAssetsInput = ListPage & {
  kind?: 'ALL' | 'DOC'
}

export type ListConversationsResponse = {
  conversations: ChatConversation[]
  nextCursor?: string | null
}

export type ListMessagesResponse = {
  messages: ChatMessage[]
  nextCursor?: string | null
}

export type ListConversationAssetsResponse = {
  attachments: ChatAttachment[]
  nextCursor?: string | null
}

export type CreateMessageResponse = {
  message: ChatMessage
}

export type ChatMessageResponse = {
  message: ChatMessage
}

export type DeleteMessageResponse = {
  success: boolean
}

export type AddReactionResponse = {
  reaction: ChatReaction
}

export type CreateAttachmentUploadIntentInput = {
  filename: string
  contentType: string
  size: number
  conversationId: string
}

export type CreateAttachmentUploadIntentResponse = {
  attachmentId: string
  uploadUrl: string
  objectPath: string
}

export type CompleteAttachmentUploadInput = {
  objectPath: string
}

export type CompleteAttachmentUploadResponse = {
  attachment: ChatAttachment
}

export type ListPage = {
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
  event?:
    | 'message.created'
    | 'message.edited'
    | 'message.unsent'
    | 'message.deleted_for_me'
    | 'reaction.added'
    | 'reaction.removed'
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
      type: 'message.edited'
      orgId: string
      conversationId: string
      payload: ChatMessage
    })
  | (ChatRealtimeEventBase & {
      type: 'message.unsent'
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
export type ChatAssistMessage = {
  role: string
  content: string
}

export type ChatAiRequest = {
  conversationContext: ChatAssistMessage[]
  prompt: string
  authContext: {
    orgId: string
    userId: string
    role?: string | null
    displayName?: string | null
    email?: string | null
    orgName?: string | null
    orgSlug?: string | null
  }
}

export type ChatAiResponse = {
  suggestedContent: string
}
