'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  Hash,
  Loader2,
  Lock,
  MessageSquare,
  Users,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useChatStore } from '@/stores/chat-store'
import { useRealtime } from '@/hooks/use-realtime'
import { chatApi, orgApi } from '@serenity/api'
import type {
  ChatAttachmentDraft,
  ChatConversation,
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

export default function ChatPage() {
  const { token, user, currentOrg, isAuthenticated } = useAuthStore(
    useShallow((state) => ({
      token: state.token,
      user: state.user,
      currentOrg: state.currentOrg,
      isAuthenticated: state.token !== null,
    })),
  )
  const {
    conversations,
    messages,
    hasMoreMessages,
    nextCursor,
    isLoadingConversations,
    isLoadingMessages,
    conversationError,
    messageError,
    replyingTo,
    threadMessage,
    setActiveConversation,
    loadMessages,
    setReplyingTo,
    setThreadMessage,
    createMessage,
    editMessage,
    unsendMessage,
    deleteMessageForMe,
    createChannel,
    createDm,
    applyRealtimeEvent,
  } = useChatStore(
    useShallow((state) => ({
      conversations: state.conversations,
      messages: state.messages,
      hasMoreMessages: state.hasMoreMessages,
      nextCursor: state.nextCursor,
      isLoadingConversations: state.isLoadingConversations,
      isLoadingMessages: state.isLoadingMessages,
      conversationError: state.conversationError,
      messageError: state.messageError,
      replyingTo: state.replyingTo,
      threadMessage: state.threadMessage,
      setActiveConversation: state.setActiveConversation,
      loadMessages: state.loadMessages,
      setReplyingTo: state.setReplyingTo,
      setThreadMessage: state.setThreadMessage,
      createMessage: state.createMessage,
      editMessage: state.editMessage,
      unsendMessage: state.unsendMessage,
      deleteMessageForMe: state.deleteMessageForMe,
      createChannel: state.createChannel,
      createDm: state.createDm,
      applyRealtimeEvent: state.applyRealtimeEvent,
    })),
  )
  const realtime = useRealtime(token, isAuthenticated)
  const router = useRouter()
  const { orgSlug, conversationId: routeConversationId } = useParams<{
    orgSlug: string
    conversationId?: string
  }>()
  const selectedConversationId = Array.isArray(routeConversationId)
    ? routeConversationId[0]
    : routeConversationId

  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showCreateDm, setShowCreateDm] = useState(false)

  const getConversationName = useCallback(
    (conversation: ChatConversation) => {
      if (conversation.name) return conversation.name
      return conversation.members
        .filter(member => member.userId !== user?.id)
        .map(member => member.user.displayName)
        .join(', ') || 'You'
    },
    [user?.id]
  )

  const selectedConversation = useMemo(() => {
    if (conversations.length === 0) return null
    if (!selectedConversationId) return null
    return conversations.find(conversation => conversation.id === selectedConversationId) ?? null
  }, [conversations, selectedConversationId])

  const selectedConversationName = selectedConversation
    ? getConversationName(selectedConversation)
    : 'Messages'

  useEffect(() => {
    const nextConversationId = selectedConversationId ?? null
    setActiveConversation(nextConversationId)
    if (nextConversationId && token) {
      void loadMessages(token, nextConversationId)
    }
  }, [loadMessages, selectedConversationId, setActiveConversation, token])

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
    if (!token) return

    const applyChatEvent = (data: unknown) => applyRealtimeEvent(data as ChatRealtimeEvent)

    const unsubscribeCreated = realtime.subscribe('message.created', applyChatEvent)
    const unsubscribeEdited = realtime.subscribe('message.edited', applyChatEvent)
    const unsubscribeUnsent = realtime.subscribe('message.unsent', applyChatEvent)
    const unsubscribeReactionAdded = realtime.subscribe('reaction.added', applyChatEvent)
    const unsubscribeReactionRemoved = realtime.subscribe('reaction.removed', applyChatEvent)

    return () => {
      unsubscribeCreated()
      unsubscribeEdited()
      unsubscribeUnsent()
      unsubscribeReactionAdded()
      unsubscribeReactionRemoved()
    }
  }, [applyRealtimeEvent, realtime, token])

  const selectConversation = (conversationId: string) => {
    router.push(`/${orgSlug}/chat/${encodeURIComponent(conversationId)}`)
  }

  const handleLoadMore = () => {
    if (selectedConversation && nextCursor && !isLoadingMessages) {
      void loadMessages(token, selectedConversation.id, nextCursor)
    }
  }

  const loadMembers = useCallback(async (): Promise<Member[]> => {
    if (!token || !currentOrg?.id) return []
    const response = await orgApi.listMembers(currentOrg.id, token)
    return response.members
  }, [currentOrg?.id, token])

  const uploadChatFile = async (file: File): Promise<ChatAttachmentDraft> => {
    if (!token || !selectedConversation) {
      throw new Error('Select a conversation before uploading')
    }

    const contentType = file.type || 'text/plain'
    const intent = await chatApi.createUploadIntent(token, {
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

    const completed = await chatApi.completeAttachmentUpload(token, intent.attachmentId, {
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
    if (!token || !selectedConversation) return

    await createMessage(token, selectedConversation.id, {
      content,
      parentId: replyingTo?.id,
      attachmentIds,
    })
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!token) return
    await chatApi.addReaction(token, messageId, emoji)
  }

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!token) return
    await chatApi.removeReaction(token, messageId, emoji)
  }

  const handleEditMessage = async (messageId: string, content: string) => {
    if (!token) return
    await editMessage(token, messageId, content)
  }

  const handleUnsendMessage = async (messageId: string) => {
    if (!token) return
    await unsendMessage(token, messageId)
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!token) return
    await deleteMessageForMe(token, messageId)
  }

  const handleCreateChannel = async (
    name: string,
    type: 'PUBLIC_CHANNEL' | 'PRIVATE_CHANNEL',
    memberIds: string[]
  ) => {
    if (!token) return
    const conversation = await createChannel(token, { name, type, memberIds })
    selectConversation(conversation.id)
  }

  const handleCreateDm = async (memberId: string) => {
    if (!token) return
    const conversation = await createDm(token, { memberIds: [memberId] })
    selectConversation(conversation.id)
  }

  if (!isAuthenticated || !user) {
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
              currentUserId={user.id}
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

      {threadMessage && token && selectedConversation && (
        <ThreadPanel
          parentMessage={threadMessage}
          conversationId={selectedConversation.id}
          currentUserId={user.id}
          token={token}
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
          currentUserId={user.id}
          onClose={() => setShowCreateChannel(false)}
          onCreate={handleCreateChannel}
          onLoadMembers={loadMembers}
        />
      )}

      {showCreateDm && (
        <CreateDmDialog
          currentUserId={user.id}
          onClose={() => setShowCreateDm(false)}
          onCreate={handleCreateDm}
          onLoadMembers={loadMembers}
        />
      )}
    </div>
  )
}
