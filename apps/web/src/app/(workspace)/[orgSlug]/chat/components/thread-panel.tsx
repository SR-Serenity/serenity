'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { ChatMessage, ChatAttachmentInput } from '@serenity/api'
import { chatApi } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { MessageItem } from './message-item'
import { MessageInput } from './message-input'

type ThreadPanelProps = {
  parentMessage: ChatMessage
  conversationId: string
  currentUserId: string
  token: string
  onClose: () => void
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
}

export function ThreadPanel({
  parentMessage,
  conversationId,
  currentUserId,
  token,
  onClose,
  onAddReaction,
  onRemoveReaction,
}: ThreadPanelProps) {
  const [replies, setReplies] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadReplies()
  }, [parentMessage.id])

  const loadReplies = async () => {
    setIsLoading(true)
    try {
      const response = await chatApi.listMessages(token, conversationId, parentMessage.id)
      setReplies(response.messages)
    } catch (error) {
      console.error('Failed to load replies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendReply = async (content: string, attachments: ChatAttachmentInput[]) => {
    const response = await chatApi.createMessage(token, conversationId, {
      content,
      parentId: parentMessage.id,
      attachments,
    })
    setReplies(prev => [...prev, response.message])
  }

  return (
    <div className="flex h-full w-96 flex-col border-l border-divider bg-surface">
      <div className="flex items-center justify-between border-b border-divider p-4">
        <h3 className="font-semibold text-caption">Thread</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-divider bg-panel">
          <MessageItem
            message={parentMessage}
            currentUserId={currentUserId}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : replies.length === 0 ? (
          <div className="flex justify-center py-8 text-sm text-muted">
            No replies yet
          </div>
        ) : (
          <div>
            {replies.map(reply => (
              <MessageItem
                key={reply.id}
                message={reply}
                currentUserId={currentUserId}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
              />
            ))}
          </div>
        )}
      </div>

      <MessageInput onSend={handleSendReply} />
    </div>
  )
}
