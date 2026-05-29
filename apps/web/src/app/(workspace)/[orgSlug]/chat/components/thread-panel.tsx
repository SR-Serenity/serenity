'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, MessageSquareReply, X } from 'lucide-react'
import type {
  ChatAttachmentDraft,
  ChatMessage,
  ChatReaction,
  ChatRealtimeEvent,
  ChatUser,
} from '@serenity/api'
import { chatApi } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { MessageItem } from './message-item'
import { MessageInput } from './message-input'

type RealtimeSubscribe = (eventType: string, callback: (data: unknown) => void) => () => void

type ThreadPanelProps = {
  parentMessage: ChatMessage
  conversationId: string
  currentUserId: string
  currentUser: ChatUser
  localReply?: ChatMessage | null
  onLocalReplyHandled?: () => void
  token: string
  onClose: () => void
  onUploadFile: (file: File) => Promise<ChatAttachmentDraft>
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
  onEditMessage: (messageId: string, content: string) => Promise<void>
  onUnsendMessage: (messageId: string) => Promise<void>
  onDeleteMessage: (messageId: string) => Promise<void>
  realtimeSubscribe: RealtimeSubscribe
}

function upsertMessage(messages: ChatMessage[], nextMessage: ChatMessage) {
  if (messages.some(message => message.id === nextMessage.id)) {
    return messages.map(message => (message.id === nextMessage.id ? nextMessage : message))
  }
  return [...messages, nextMessage]
}

function mergeReplies(loadedReplies: ChatMessage[], currentReplies: ChatMessage[]) {
  const loadedIds = new Set(loadedReplies.map(message => message.id))
  const localReplies = currentReplies.filter(message => !loadedIds.has(message.id))
  return [...loadedReplies, ...localReplies]
}

function createOptimisticId(scope: string) {
  return `optimistic-${scope}-${Date.now()}-${Math.random().toString(36).slice(2)}`
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

function updateMessageReaction(
  messages: ChatMessage[],
  messageId: string,
  update: (message: ChatMessage) => ChatMessage
) {
  return messages.map(message => (message.id === messageId ? update(message) : message))
}

export function ThreadPanel({
  parentMessage,
  conversationId,
  currentUserId,
  currentUser,
  localReply,
  onLocalReplyHandled,
  token,
  onClose,
  onUploadFile,
  onAddReaction,
  onRemoveReaction,
  onEditMessage,
  onUnsendMessage,
  onDeleteMessage,
  realtimeSubscribe,
}: ThreadPanelProps) {
  const [parent, setParent] = useState(parentMessage)
  const [replies, setReplies] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setParent(parentMessage)
  }, [parentMessage])

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    chatApi.listMessages(token, conversationId, parentMessage.id)
      .then(response => {
        if (!active) return
        setReplies(prev => mergeReplies(response.messages, prev))
      })
      .catch(loadError => {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load thread')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [conversationId, parentMessage.id, token])

  useEffect(() => {
    if (!localReply || localReply.parentId !== parentMessage.id) return
    setReplies(prev => upsertMessage(prev, localReply))
    onLocalReplyHandled?.()
  }, [localReply, onLocalReplyHandled, parentMessage.id])

  useEffect(() => {
    const onMessageCreated = realtimeSubscribe('message.created', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type !== 'message.created' || event.conversationId !== conversationId) return
      if (event.payload.parentId === parentMessage.id) {
        setReplies(prev => upsertMessage(prev, event.payload))
      }
    })

    const onMessageEdited = realtimeSubscribe('message.edited', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type !== 'message.edited' || event.conversationId !== conversationId) return
      if (event.payload.id === parentMessage.id) {
        setParent(event.payload)
      } else if (event.payload.parentId === parentMessage.id) {
        setReplies(prev => upsertMessage(prev, event.payload))
      }
    })

    const onMessageUnsent = realtimeSubscribe('message.unsent', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type !== 'message.unsent' || event.conversationId !== conversationId) return
      if (event.payload.id === parentMessage.id) {
        setParent(event.payload)
      } else if (event.payload.parentId === parentMessage.id) {
        setReplies(prev => upsertMessage(prev, event.payload))
      }
    })

    const onReactionAdded = realtimeSubscribe('reaction.added', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type !== 'reaction.added' || event.conversationId !== conversationId) return
      const { messageId, reaction } = event.payload as { messageId: string; reaction: ChatReaction }
      if (messageId === parentMessage.id) {
        setParent(prev => ({
          ...prev,
          reactions: prev.reactions.some(item => item.id === reaction.id)
            ? prev.reactions
            : [...prev.reactions, reaction],
        }))
      }
      setReplies(prev =>
        updateMessageReaction(prev, messageId, message => ({
          ...message,
          reactions: message.reactions.some(item => item.id === reaction.id)
            ? message.reactions
            : [...message.reactions, reaction],
        }))
      )
    })

    const onReactionRemoved = realtimeSubscribe('reaction.removed', (data) => {
      const event = data as ChatRealtimeEvent
      if (event.type !== 'reaction.removed' || event.conversationId !== conversationId) return
      const { messageId, userId, emoji } = event.payload as {
        messageId: string
        userId: string
        emoji: string
      }
      if (messageId === parentMessage.id) {
        setParent(prev => ({
          ...prev,
          reactions: prev.reactions.filter(
            reaction => !(reaction.userId === userId && reaction.emoji === emoji)
          ),
        }))
      }
      setReplies(prev =>
        updateMessageReaction(prev, messageId, message => ({
          ...message,
          reactions: message.reactions.filter(
            reaction => !(reaction.userId === userId && reaction.emoji === emoji)
          ),
        }))
      )
    })

    return () => {
      onMessageCreated()
      onMessageEdited()
      onMessageUnsent()
      onReactionAdded()
      onReactionRemoved()
    }
  }, [conversationId, parentMessage.id, realtimeSubscribe])

  const handleSendReply = async (content: string, attachmentIds: string[]) => {
    const optimisticId = createOptimisticId('reply')
    const createdAt = new Date().toISOString()
    const optimisticReply: ChatMessage = {
      id: optimisticId,
      conversationId,
      authorId: currentUser.id,
      parentId: parentMessage.id,
      content,
      createdAt,
      updatedAt: createdAt,
      editedAt: null,
      unsentAt: null,
      author: currentUser,
      attachments: [],
      reactions: [],
    }

    setReplies(prev => upsertMessage(prev, optimisticReply))

    try {
      const response = await chatApi.createMessage(token, conversationId, {
        content,
        parentId: parentMessage.id,
        attachmentIds,
      })
      setReplies(prev => replaceOptimisticMessage(prev, optimisticId, response.message))
    } catch (sendError) {
      setReplies(prev => prev.filter(message => message.id !== optimisticId))
      throw sendError
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            title="Back to messages"
            className="sm:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <MessageSquareReply className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900">Thread</h3>
            <p className="text-xs text-gray-500">{replies.length} replies</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} title="Close thread">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="border-b border-gray-100 bg-white py-2">
          <MessageItem
            message={parent}
            currentUserId={currentUserId}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
            onEditMessage={onEditMessage}
            onUnsendMessage={onUnsendMessage}
            onDeleteMessage={onDeleteMessage}
          />
        </div>

        {isLoading && replies.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="px-5 py-8 text-center text-sm text-red-600">{error}</div>
        ) : replies.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            No replies yet
          </div>
        ) : (
          <div className="py-2">
            {replies.map(reply => (
              <MessageItem
                key={reply.id}
                message={reply}
                currentUserId={currentUserId}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
                onEditMessage={onEditMessage}
                onUnsendMessage={onUnsendMessage}
                onDeleteMessage={onDeleteMessage}
              />
            ))}
          </div>
        )}
      </div>

      <MessageInput
        onSend={handleSendReply}
        onUploadFile={onUploadFile}
        placeholder="Reply in thread"
        conversationContext={[parent, ...replies].slice(-10).map((m) => ({
          role: m.author.displayName,
          content: m.content || '(Attachment)',
        }))}
      />
    </div>
  )
}
