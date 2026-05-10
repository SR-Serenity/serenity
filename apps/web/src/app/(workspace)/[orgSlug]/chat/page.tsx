'use client'

import { useEffect, useState } from 'react'
import { Hash, Loader2, Lock, MessageSquare, Plus, Users } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { chatApi } from '@serenity/api'
import type {
  ChatConversation,
  ChatMessage,
  ChatAttachmentInput,
  ChatReaction,
  ChatRealtimeEvent,
} from '@serenity/api'
import { MessageList } from './components/message-list'
import { MessageInput } from './components/message-input'
import { ThreadPanel } from './components/thread-panel'
import { CreateChannelDialog } from './components/create-channel-dialog'
import { CreateDmDialog } from './components/create-dm-dialog'
import { Button } from '@/app/shared/components/ui/button'

export default function ChatPage() {
  const auth = useAuth()
  const realtime = useRealtime(auth.token, auth.isAuthenticated)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedConversationId = searchParams.get('conversation')
  const newConversationType = searchParams.get('new')

  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [threadMessage, setThreadMessage] = useState<ChatMessage | null>(null)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showCreateDm, setShowCreateDm] = useState(false)

  useEffect(() => {
    if (auth.token) {
      loadConversations()
    }
  }, [auth.token])

  useEffect(() => {
    if (conversations.length === 0) return
    const conversation = conversations.find(item => item.id === selectedConversationId)
    setSelectedConversation(conversation ?? conversations[0])
  }, [conversations, selectedConversationId])

  useEffect(() => {
    if (newConversationType === 'channel') {
      setShowCreateChannel(true)
    }
    if (newConversationType === 'dm') {
      setShowCreateDm(true)
    }
    if (newConversationType) {
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete('new')
      const nextQuery = nextParams.toString()
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
    }
  }, [newConversationType, pathname, router, searchParams])

  useEffect(() => {
    if (selectedConversation && auth.token) {
      loadMessages(selectedConversation.id)
    }
  }, [selectedConversation?.id, auth.token])

  useEffect(() => {
    if (!auth.token || !selectedConversation) return

    const unsubscribe = realtime.subscribe('message.created', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type === 'message.created' && event.conversationId === selectedConversation.id) {
        const newMessage = event.payload as ChatMessage
        if (!newMessage.parentId) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
      }
    })

    return unsubscribe
  }, [auth.token, selectedConversation?.id, realtime])

  useEffect(() => {
    if (!auth.token) return

    const unsubscribeAdded = realtime.subscribe('reaction.added', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type === 'reaction.added') {
        const { messageId, reaction } = event.payload as { messageId: string; reaction: ChatReaction }
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...msg, reactions: [...msg.reactions, reaction] }
              : msg
          )
        )
      }
    })

    const unsubscribeRemoved = realtime.subscribe('reaction.removed', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type === 'reaction.removed') {
        const { messageId, userId, emoji } = event.payload as {
          messageId: string
          userId: string
          emoji: string
        }
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  reactions: msg.reactions.filter(
                    r => !(r.userId === userId && r.emoji === emoji)
                  ),
                }
              : msg
          )
        )
      }
    })

    return () => {
      unsubscribeAdded()
      unsubscribeRemoved()
    }
  }, [auth.token, realtime])

  const loadConversations = async () => {
    if (!auth.token) return
    setIsLoadingConversations(true)
    try {
      const response = await chatApi.listConversations(auth.token)
      setConversations(response.conversations)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  const loadMessages = async (conversationId: string, cursor?: string) => {
    if (!auth.token) return
    setIsLoadingMessages(true)
    try {
      const response = await chatApi.listMessages(auth.token, conversationId, undefined, {
        limit: 50,
        cursor,
      })
      if (cursor) {
        setMessages(prev => [...response.messages.reverse(), ...prev])
      } else {
        setMessages(response.messages.reverse())
      }
      setHasMoreMessages(!!response.nextCursor)
      setNextCursor(response.nextCursor ?? null)
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const handleLoadMore = () => {
    if (selectedConversation && nextCursor && !isLoadingMessages) {
      loadMessages(selectedConversation.id, nextCursor)
    }
  }

  const handleSendMessage = async (content: string, attachments: ChatAttachmentInput[]) => {
    if (!auth.token || !selectedConversation) return

    await chatApi.createMessage(auth.token, selectedConversation.id, {
      content,
      parentId: replyingTo?.id,
      attachments,
    })

    setReplyingTo(null)
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!auth.token) return
    try {
      await chatApi.addReaction(auth.token, messageId, emoji)
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!auth.token) return
    try {
      await chatApi.removeReaction(auth.token, messageId, emoji)
    } catch (error) {
      console.error('Failed to remove reaction:', error)
    }
  }

  const handleCreateChannel = async (name: string, type: 'PUBLIC_CHANNEL' | 'PRIVATE_CHANNEL') => {
    if (!auth.token) return
    const conversation = await chatApi.createChannel(auth.token, { name, type })
    setConversations(prev => [conversation, ...prev])
    setSelectedConversation(conversation)
  }

  const handleCreateDm = async (memberIds: string[]) => {
    if (!auth.token) return
    const conversation = await chatApi.createDm(auth.token, { memberIds })
    setConversations(prev => [conversation, ...prev])
    setSelectedConversation(conversation)
  }

  const handleLoadUsers = async () => {
    const users = conversations.flatMap(c => c.members.map(m => m.user))
    const uniqueUsers = Array.from(
      new Map(users.map(u => [u.id, u])).values()
    )
    return uniqueUsers
  }

  const getConversationName = (conv: ChatConversation) => {
    if (conv.name) return conv.name
    return conv.members
      .filter(m => m.userId !== auth.user?.id)
      .map(m => m.user.displayName)
      .join(', ') || 'You'
  }

  const getConversationIcon = (conv: ChatConversation) => {
    if (conv.type === 'PUBLIC_CHANNEL') return <Hash className="h-5 w-5" />
    if (conv.type === 'PRIVATE_CHANNEL') return <Lock className="h-5 w-5" />
    return <MessageSquare className="h-5 w-5" />
  }

  if (!auth.isAuthenticated || !auth.user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    )
  }

  if (isLoadingConversations) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-0 bg-surface">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-divider bg-panel">
          <div className="flex min-h-16 items-center gap-3 px-6 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
                {selectedConversation ? getConversationIcon(selectedConversation) : (
                  <MessageSquare className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-caption">
                  {selectedConversation ? getConversationName(selectedConversation) : 'Messenger'}
                </h1>
                <div className="flex items-center gap-2 text-xs text-muted">
                  {selectedConversation ? (
                    <>
                      <span>
                        {selectedConversation.members.length} member
                        {selectedConversation.members.length !== 1 ? 's' : ''}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-muted" />
                      <span className="capitalize">
                        {selectedConversation.type.toLowerCase().replace('_', ' ')}
                      </span>
                    </>
                  ) : (
                    <span>{conversations.length} conversations</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  realtime.status === 'connected'
                    ? 'bg-green-500'
                    : realtime.status === 'connecting'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                title={`Realtime: ${realtime.status}`}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateDm(true)}
                className="h-9 gap-2"
              >
                <Users className="h-4 w-4" />
                DM
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateChannel(true)}
                className="h-9 gap-2"
              >
                <Plus className="h-4 w-4" />
                Channel
              </Button>
            </div>
          </div>
        </div>

        {selectedConversation ? (
          <>
            <MessageList
              messages={messages}
              currentUserId={auth.user.id}
              hasMore={hasMoreMessages}
              isLoading={isLoadingMessages}
              onLoadMore={handleLoadMore}
              onReply={setReplyingTo}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
              onOpenThread={setThreadMessage}
            />

            <MessageInput
              onSend={handleSendMessage}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-muted">
            <p>Select conversation to start chatting.</p>
          </div>
        )}
      </div>

      {threadMessage && auth.token && selectedConversation && (
        <ThreadPanel
          parentMessage={threadMessage}
          conversationId={selectedConversation.id}
          currentUserId={auth.user.id}
          token={auth.token}
          onClose={() => setThreadMessage(null)}
          onAddReaction={handleAddReaction}
          onRemoveReaction={handleRemoveReaction}
        />
      )}

      {showCreateChannel && (
        <CreateChannelDialog
          onClose={() => setShowCreateChannel(false)}
          onCreate={handleCreateChannel}
        />
      )}

      {showCreateDm && (
        <CreateDmDialog
          currentUserId={auth.user.id}
          onClose={() => setShowCreateDm(false)}
          onCreate={handleCreateDm}
          onLoadUsers={handleLoadUsers}
        />
      )}
    </div>
  )
}
