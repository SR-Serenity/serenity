'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { ChatMessage } from '@serenity/api'
import { MessageItem } from './message-item'

type MessageListProps = {
  messages: ChatMessage[]
  currentUserId: string
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  onReply: (message: ChatMessage) => void
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
  onOpenThread: (message: ChatMessage) => void
}

export function MessageList({
  messages,
  currentUserId,
  hasMore,
  isLoading,
  onLoadMore,
  onReply,
  onAddReaction,
  onRemoveReaction,
  onOpenThread,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const prevMessagesLengthRef = useRef(messages.length)

  useEffect(() => {
    if (!scrollRef.current) return

    const isNewMessage = messages.length > prevMessagesLengthRef.current
    prevMessagesLengthRef.current = messages.length

    if (autoScroll && isNewMessage) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, autoScroll])

  const handleScroll = () => {
    if (!scrollRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    setAutoScroll(isAtBottom)

    if (scrollTop < 100 && hasMore && !isLoading) {
      onLoadMore()
    }
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        <p>No messages yet. Start the conversation!</p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      {isLoading && hasMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      )}

      <div className="flex flex-col">
        {messages.map(message => (
          <MessageItem
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            onReply={onReply}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
            onOpenThread={onOpenThread}
          />
        ))}
      </div>
    </div>
  )
}
