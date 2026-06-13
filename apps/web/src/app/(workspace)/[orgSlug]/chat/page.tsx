'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  Hash,
  FileText,
  Loader2,
  Lock,
  MessageSquare,
  UserPlus,
  Users,
  Video,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useChatStore } from '@/stores/chat-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useRealtime } from '@/hooks/use-realtime'
import { chatApi } from '@serenity/api'
import type {
  ChatAttachmentDraft,
  ChatConversation,
  ChatMessage,
  ChatRealtimeEvent,
  Member,
} from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { MessageList } from './components/message-list'
import { MessageInput } from './components/message-input'
import { ThreadPanel } from './components/thread-panel'
import { CreateChannelDialog } from './components/create-channel-dialog'
import { CreateDmDialog } from './components/create-dm-dialog'
import { ConversationAssetsPanel } from './components/conversation-assets-panel'
import { ConversationMembersDialog } from './components/conversation-members-dialog'

type ChatTab = 'messages' | 'files' | 'docs'

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
    addReaction,
    removeReaction,
    createChannel,
    createDm,
    addConversationMembers,
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
      addReaction: state.addReaction,
      removeReaction: state.removeReaction,
      createChannel: state.createChannel,
      createDm: state.createDm,
      addConversationMembers: state.addConversationMembers,
      applyRealtimeEvent: state.applyRealtimeEvent,
    })),
  )
  const realtime = useRealtime(token, isAuthenticated)
  const loadWorkspaceMembers = useWorkspaceStore((state) => state.loadMembers)
  const membersByOrgId = useWorkspaceStore((state) => state.membersByOrgId)
  const workspaceMembers = currentOrg ? (membersByOrgId[currentOrg.id] ?? []) : []
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
  const [memberDialogMode, setMemberDialogMode] = useState<'view' | 'add' | null>(null)
  const [activeTab, setActiveTab] = useState<ChatTab>('messages')
  const [localThreadReply, setLocalThreadReply] = useState<ChatMessage | null>(null)

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
  const isGroupConversation = Boolean(
    selectedConversation && selectedConversation.type !== 'DM',
  )

  useEffect(() => {
    const nextConversationId = selectedConversationId ?? null
    setActiveConversation(nextConversationId)
    if (nextConversationId && token) {
      void loadMessages(token, nextConversationId)
    }
    setActiveTab('messages')
  }, [loadMessages, selectedConversationId, setActiveConversation, token])

  useEffect(() => {
    if (token && currentOrg?.id) {
      void loadWorkspaceMembers(currentOrg.id, token)
    }
  }, [token, currentOrg?.id, loadWorkspaceMembers])

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
    return loadWorkspaceMembers(currentOrg.id, token)
  }, [currentOrg?.id, loadWorkspaceMembers, token])

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

    const uploadResponse = await fetch(intent.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    })

    if (!uploadResponse.ok) {
      throw new Error('GCS upload failed')
    }

    const completed = await chatApi.completeAttachmentUpload(token, intent.attachmentId, {
      objectPath: intent.objectPath,
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

    const sentMessage = await createMessage(token, selectedConversation.id, {
      content,
      replyToId: replyingTo?.id,
      replyTo: replyingTo,
      attachmentIds,
    })

    if (sentMessage.parentId && threadMessage?.id === sentMessage.parentId) {
      setLocalThreadReply(sentMessage)
    }
  }

  const handleOpenThread = (message: ChatMessage) => {
    setActiveTab('messages')
    setThreadMessage(message)
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!token) return
    await addReaction(token, messageId, emoji)
  }

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!token) return
    await removeReaction(token, messageId, emoji)
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

  const handleAddMembers = async (memberIds: string[]) => {
    if (!token || !selectedConversation || selectedConversation.type === 'DM') return
    await addConversationMembers(token, selectedConversation.id, { memberIds })
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
        <div className="shrink-0 border-b border-gray-100 bg-white">
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
            <div className="flex min-w-0 items-center gap-2.5">
              {selectedConversation?.type !== 'DM' && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  {selectedConversation ? (
                    selectedConversation.type === 'PRIVATE_CHANNEL' ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Hash className="h-4 w-4" />
                    )
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-gray-900">
                  {selectedConversationName}
                </h2>
                {selectedConversation && selectedConversation.type !== 'DM' && (
                  <div className="truncate text-xs text-gray-500">
                    {selectedConversation.members.length} members
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isGroupConversation && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMemberDialogMode('view')}
                    title="Members"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMemberDialogMode('add')}
                    title="Add member"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled
                    title="Video call"
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                </>
              )}
              {!selectedConversation && (
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
              )}
            </div>
          </div>
          {selectedConversation && (
            <div className="flex h-9 items-end gap-1 px-3">
              {([
                ['messages', MessageSquare, 'Messages'],
                ['files', FileText, 'Files'],
                ['docs', FileText, 'Docs'],
              ] as const).map(([tab, Icon, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex h-8 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
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
            {activeTab === 'messages' ? (
              threadMessage && token ? (
                <ThreadPanel
                  parentMessage={threadMessage}
                  conversationId={selectedConversation.id}
                  currentUserId={user.id}
                  currentUser={user}
                  localReply={localThreadReply}
                  onLocalReplyHandled={() => setLocalThreadReply(null)}
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
              ) : (
                <>
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
                    onOpenThread={handleOpenThread}
                    onEditMessage={handleEditMessage}
                    onUnsendMessage={handleUnsendMessage}
                    onDeleteMessage={handleDeleteMessage}
                  />

                  <MessageInput
                    onSend={handleSendMessage}
                    onUploadFile={uploadChatFile}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    placeholder={`Message ${selectedConversationName} · type @ to mention`}
                    members={workspaceMembers}
                    conversationContext={messages.slice(-10).map((m) => ({
                      role: m.author.displayName,
                      content: m.content || '(Attachment)',
                    }))}
                  />
                </>
              )
            ) : (
              <ConversationAssetsPanel
                token={token ?? ''}
                conversationId={selectedConversation.id}
                kind={activeTab === 'docs' ? 'DOC' : 'ALL'}
              />
            )}
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

      {memberDialogMode && selectedConversation && selectedConversation.type !== 'DM' && (
        <ConversationMembersDialog
          mode={memberDialogMode}
          conversation={selectedConversation}
          currentUserId={user.id}
          onClose={() => setMemberDialogMode(null)}
          onLoadMembers={loadMembers}
          onAddMembers={handleAddMembers}
        />
      )}

    </div>
  )
}
