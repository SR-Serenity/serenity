'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Hash,
  Loader2,
  Lock,
  MessageSquare,
  Users,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { chatApi, orgApi } from '@serenity/api'
import type {
  ChatAttachmentDraft,
  ChatConversation,
  ChatMessage,
  ChatReaction,
  ChatRealtimeEvent,
  Member,
} from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { MessageList } from './components/message-list'
import { MessageInput } from './components/message-input'
import { ThreadPanel } from './components/thread-panel'
import { CreateChannelDialog } from './components/create-channel-dialog'
import { CreateDmDialog } from './components/create-dm-dialog'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'S'
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
  update: (message: ChatMessage) => ChatMessage
) {
  return messages.map(message => (message.id === messageId ? update(message) : message))
}

export default function ChatPage() {
  const auth = useAuth()
  const realtime = useRealtime(auth.token, auth.isAuthenticated)
  const router = useRouter()
  const { orgSlug, conversationId: routeConversationId } = useParams<{
    orgSlug: string
    conversationId?: string
  }>()
  const selectedConversationId = Array.isArray(routeConversationId)
    ? routeConversationId[0]
    : routeConversationId

  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [threadMessage, setThreadMessage] = useState<ChatMessage | null>(null)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showCreateDm, setShowCreateDm] = useState(false)

  const getConversationName = useCallback(
    (conversation: ChatConversation) => {
      if (conversation.name) return conversation.name
      return conversation.members
        .filter(member => member.userId !== auth.user?.id)
        .map(member => member.user.displayName)
        .join(', ') || 'You'
    },
    [auth.user?.id]
  )

  const selectedConversation = useMemo(() => {
    if (conversations.length === 0) return null
    if (!selectedConversationId) return null
    return conversations.find(conversation => conversation.id === selectedConversationId) ?? null
  }, [conversations, selectedConversationId])

  const selectedConversationName = selectedConversation
    ? getConversationName(selectedConversation)
    : 'Messages'

  const loadConversations = useCallback(async () => {
    if (!auth.token) return
    setIsLoadingConversations(true)
    setConversationError(null)
    try {
      const response = await chatApi.listConversations(auth.token)
      setConversations(response.conversations)
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : 'Failed to load conversations')
    } finally {
      setIsLoadingConversations(false)
    }
  }, [auth.token])

  const loadMessages = useCallback(
    async (conversationId: string, cursor?: string) => {
      if (!auth.token) return
      setIsLoadingMessages(true)
      setMessageError(null)
      try {
        const response = await chatApi.listMessages(auth.token, conversationId, undefined, {
          limit: 50,
          cursor,
        })
        if (cursor) {
          setMessages(prev => [...response.messages, ...prev])
        } else {
          setMessages(response.messages)
        }
        setHasMoreMessages(Boolean(response.nextCursor))
        setNextCursor(response.nextCursor ?? null)
      } catch (error) {
        setMessageError(error instanceof Error ? error.message : 'Failed to load messages')
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [auth.token]
  )

  useEffect(() => {
    if (auth.token) {
      void loadConversations()
    }
  }, [auth.token, loadConversations])

  useEffect(() => {
    if (selectedConversation && auth.token) {
      setMessages([])
      setReplyingTo(null)
      setThreadMessage(null)
      void loadMessages(selectedConversation.id)
    }
  }, [selectedConversation?.id, auth.token, loadMessages])

  useEffect(() => {
    const openDialog = (event: Event) => {
      const detail = (event as CustomEvent<'channel' | 'dm'>).detail
      if (detail === 'channel') setShowCreateChannel(true)
      if (detail === 'dm') setShowCreateDm(true)
    }

    window.addEventListener('serenity:open-chat-dialog', openDialog)
    return () => window.removeEventListener('serenity:open-chat-dialog', openDialog)
  }, [])

  useEffect(() => {
    if (!auth.token) return

    const unsubscribeCreated = realtime.subscribe('message.created', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type !== 'message.created') return
      const nextMessage = event.payload

      setConversations(prev =>
        prev.map(conversation =>
          conversation.id === event.conversationId
            ? { ...conversation, lastMessage: nextMessage, updatedAt: nextMessage.createdAt }
            : conversation
        )
      )

      if (event.conversationId === selectedConversation?.id && !nextMessage.parentId) {
        setMessages(prev => upsertMessage(prev, nextMessage))
      }
    })

    const unsubscribeEdited = realtime.subscribe('message.edited', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type !== 'message.edited') return
      if (event.conversationId === selectedConversation?.id) {
        setMessages(prev => upsertMessage(prev, event.payload))
      }
      setConversations(prev =>
        prev.map(conversation =>
          conversation.lastMessage?.id === event.payload.id
            ? { ...conversation, lastMessage: event.payload }
            : conversation
        )
      )
    })

    const unsubscribeUnsent = realtime.subscribe('message.unsent', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type !== 'message.unsent') return
      if (event.conversationId === selectedConversation?.id) {
        setMessages(prev => upsertMessage(prev, event.payload))
      }
      setConversations(prev =>
        prev.map(conversation =>
          conversation.lastMessage?.id === event.payload.id
            ? { ...conversation, lastMessage: event.payload }
            : conversation
        )
      )
    })

    const unsubscribeReactionAdded = realtime.subscribe('reaction.added', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type !== 'reaction.added') return
      const { messageId, reaction } = event.payload as { messageId: string; reaction: ChatReaction }
      setMessages(prev =>
        updateReaction(prev, messageId, message => ({
          ...message,
          reactions: message.reactions.some(item => item.id === reaction.id)
            ? message.reactions
            : [...message.reactions, reaction],
        }))
      )
    })

    const unsubscribeReactionRemoved = realtime.subscribe('reaction.removed', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type !== 'reaction.removed') return
      const { messageId, userId, emoji } = event.payload as {
        messageId: string
        userId: string
        emoji: string
      }
      setMessages(prev =>
        updateReaction(prev, messageId, message => ({
          ...message,
          reactions: message.reactions.filter(
            reaction => !(reaction.userId === userId && reaction.emoji === emoji)
          ),
        }))
      )
    })

    return () => {
      unsubscribeCreated()
      unsubscribeEdited()
      unsubscribeUnsent()
      unsubscribeReactionAdded()
      unsubscribeReactionRemoved()
    }
  }, [auth.token, realtime, selectedConversation?.id])

  const selectConversation = (conversationId: string) => {
    router.push(`/${orgSlug}/chat/${encodeURIComponent(conversationId)}`)
  }

  const handleLoadMore = () => {
    if (selectedConversation && nextCursor && !isLoadingMessages) {
      void loadMessages(selectedConversation.id, nextCursor)
    }
  }

  const loadMembers = useCallback(async (): Promise<Member[]> => {
    if (!auth.token || !auth.currentOrg?.id) return []
    const response = await orgApi.listMembers(auth.currentOrg.id, auth.token)
    return response.members
  }, [auth.currentOrg?.id, auth.token])

  const uploadChatFile = async (file: File): Promise<ChatAttachmentDraft> => {
    if (!auth.token || !selectedConversation) {
      throw new Error('Select a conversation before uploading')
    }

    const contentType = file.type || 'text/plain'
    const intent = await chatApi.createUploadIntent(auth.token, {
      filename: file.name,
      contentType,
      size: file.size,
      conversationId: selectedConversation.id,
    })

    const form = new FormData()
    form.set('file', file)
    form.set('api_key', intent.apiKey)
    form.set('timestamp', String(intent.timestamp))
    form.set('signature', intent.signature)
    form.set('public_id', intent.publicId)
    form.set('folder', intent.folder)

    const uploadResponse = await fetch(intent.uploadUrl, {
      method: 'POST',
      body: form,
    })

    if (!uploadResponse.ok) {
      throw new Error('Cloudinary upload failed')
    }

    const uploaded = await uploadResponse.json() as {
      public_id: string
      secure_url: string
      bytes: number
      resource_type: string
      format?: string
      width?: number
      height?: number
    }

    const completed = await chatApi.completeAttachmentUpload(auth.token, intent.attachmentId, {
      publicId: uploaded.public_id,
      secureUrl: uploaded.secure_url,
      bytes: uploaded.bytes,
      resourceType: uploaded.resource_type,
      format: uploaded.format,
      width: uploaded.width,
      height: uploaded.height,
    })

    return {
      id: completed.attachment.id,
      name: completed.attachment.name,
      url: completed.attachment.url,
      mimeType: completed.attachment.mimeType,
      size: completed.attachment.size,
      kind: completed.attachment.kind,
    }
  }

  const handleSendMessage = async (content: string, attachmentIds: string[]) => {
    if (!auth.token || !selectedConversation) return

    const response = await chatApi.createMessage(auth.token, selectedConversation.id, {
      content,
      parentId: replyingTo?.id,
      attachmentIds,
    })

    if (!response.message.parentId) {
      setMessages(prev => upsertMessage(prev, response.message))
    }
    setConversations(prev =>
      prev.map(conversation =>
        conversation.id === selectedConversation.id
          ? { ...conversation, lastMessage: response.message, updatedAt: response.message.createdAt }
          : conversation
      )
    )
    setReplyingTo(null)
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!auth.token) return
    await chatApi.addReaction(auth.token, messageId, emoji)
  }

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!auth.token) return
    await chatApi.removeReaction(auth.token, messageId, emoji)
  }

  const handleEditMessage = async (messageId: string, content: string) => {
    if (!auth.token) return
    const response = await chatApi.editMessage(auth.token, messageId, content)
    setMessages(prev => upsertMessage(prev, response.message))
    setConversations(prev =>
      prev.map(conversation =>
        conversation.lastMessage?.id === messageId
          ? { ...conversation, lastMessage: response.message }
          : conversation
      )
    )
  }

  const handleUnsendMessage = async (messageId: string) => {
    if (!auth.token) return
    const response = await chatApi.unsendMessage(auth.token, messageId)
    setMessages(prev => upsertMessage(prev, response.message))
    setConversations(prev =>
      prev.map(conversation =>
        conversation.lastMessage?.id === messageId
          ? { ...conversation, lastMessage: response.message }
          : conversation
      )
    )
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!auth.token) return
    await chatApi.deleteMessageForMe(auth.token, messageId)
    setMessages(prev => prev.filter(message => message.id !== messageId))
  }

  const handleCreateChannel = async (
    name: string,
    type: 'PUBLIC_CHANNEL' | 'PRIVATE_CHANNEL',
    memberIds: string[]
  ) => {
    if (!auth.token) return
    const conversation = await chatApi.createChannel(auth.token, { name, type, memberIds })
    setConversations(prev => [conversation, ...prev.filter(item => item.id !== conversation.id)])
    selectConversation(conversation.id)
  }

  const handleCreateDm = async (memberId: string) => {
    if (!auth.token) return
    const conversation = await chatApi.createDm(auth.token, { memberIds: [memberId] })
    setConversations(prev => [conversation, ...prev.filter(item => item.id !== conversation.id)])
    selectConversation(conversation.id)
  }

  if (!auth.isAuthenticated || !auth.user) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-0 bg-white">
      <main className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              {selectedConversation ? (
                selectedConversation.type === 'DM' ? (
                  <span className="text-xs font-semibold">{initials(selectedConversationName)}</span>
                ) : selectedConversation.type === 'PRIVATE_CHANNEL' ? (
                  <Lock className="h-5 w-5" />
                ) : (
                  <Hash className="h-5 w-5" />
                )
              ) : (
                <MessageSquare className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-gray-900">
                {selectedConversationName}
              </h2>
              <div className="truncate text-xs text-gray-500">
                {selectedConversation
                  ? `${selectedConversation.members.length} members · ${selectedConversation.type.toLowerCase().replace('_', ' ')}`
                  : 'Pick a conversation'}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowCreateDm(true)}
            className="gap-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <Users className="h-4 w-4" />
            New DM
          </Button>
        </div>

        {conversationError && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-sm text-red-600">
            {conversationError}
          </div>
        )}

        {selectedConversation ? (
          <>
            {messageError && (
              <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-sm text-red-600">
                {messageError}
              </div>
            )}
            <MessageList
              messages={messages}
              currentUserId={auth.user.id}
              conversationName={selectedConversationName}
              hasMore={hasMoreMessages}
              isLoading={isLoadingMessages}
              onLoadMore={handleLoadMore}
              onReply={setReplyingTo}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
              onOpenThread={setThreadMessage}
              onEditMessage={handleEditMessage}
              onUnsendMessage={handleUnsendMessage}
              onDeleteMessage={handleDeleteMessage}
            />

            <MessageInput
              onSend={handleSendMessage}
              onUploadFile={uploadChatFile}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              placeholder={`Message ${selectedConversationName}`}
            />
          </>
        ) : isLoadingConversations ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Choose a conversation</h2>
              <p className="mt-1 text-sm text-gray-500">Search org members to start a DM.</p>
            </div>
          </div>
        )}
      </main>

      {threadMessage && auth.token && selectedConversation && (
        <ThreadPanel
          parentMessage={threadMessage}
          conversationId={selectedConversation.id}
          currentUserId={auth.user.id}
          token={auth.token}
          onClose={() => setThreadMessage(null)}
          onUploadFile={uploadChatFile}
          onAddReaction={handleAddReaction}
          onRemoveReaction={handleRemoveReaction}
          onEditMessage={handleEditMessage}
          onUnsendMessage={handleUnsendMessage}
          onDeleteMessage={handleDeleteMessage}
          realtimeSubscribe={realtime.subscribe}
        />
      )}

      {showCreateChannel && (
        <CreateChannelDialog
          currentUserId={auth.user.id}
          onClose={() => setShowCreateChannel(false)}
          onCreate={handleCreateChannel}
          onLoadMembers={loadMembers}
        />
      )}

      {showCreateDm && (
        <CreateDmDialog
          currentUserId={auth.user.id}
          onClose={() => setShowCreateDm(false)}
          onCreate={handleCreateDm}
          onLoadMembers={loadMembers}
        />
      )}
    </div>
  )
}
