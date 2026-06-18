'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, MessageSquare } from 'lucide-react'
import type { ChatMessage } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { MessageItem } from './message-item'

type MessageListProps = {
  messages: ChatMessage[]
  currentUserId: string
  conversationName: string
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  onReply: (message: ChatMessage) => void
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
  onOpenThread: (message: ChatMessage) => void
  onEditMessage: (messageId: string, content: string) => Promise<void>
  onUnsendMessage: (messageId: string) => Promise<void>
  onDeleteMessage: (messageId: string) => Promise<void>
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function sameAuthorCluster(current: ChatMessage, previous?: ChatMessage) {
  if (!previous) return false
  const currentDate = new Date(current.createdAt).getTime()
  const previousDate = new Date(previous.createdAt).getTime()
  return (
    current.authorId === previous.authorId &&
    Boolean(current.isCopilot) === Boolean(previous.isCopilot) &&
    sameDay(current.createdAt, previous.createdAt) &&
    currentDate - previousDate < 5 * 60 * 1000
  )
}

function DateDivider({ value }: { value: string }) {
  return (
    <div className="sticky top-2 z-10 my-2 flex justify-center">
      <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500 shadow-sm">
        {new Date(value).toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
      </span>
    </div>
  )
}

export function MessageList({
  messages,
  currentUserId,
  conversationName,
  hasMore,
  isLoading,
  onLoadMore,
  onReply,
  onAddReaction,
  onRemoveReaction,
  onOpenThread,
  onEditMessage,
  onUnsendMessage,
  onDeleteMessage,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const prevLengthRef = useRef(messages.length)

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return

    const isNewMessage = messages.length > prevLengthRef.current
    prevLengthRef.current = messages.length

    if (autoScroll && isNewMessage) {
      scroller.scrollTop = scroller.scrollHeight
    }
  }, [messages, autoScroll])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    scroller.scrollTop = scroller.scrollHeight
    prevLengthRef.current = messages.length
  }, [conversationName])

  const rows = useMemo(() => {
    return messages.map((message, index) => ({
      message,
      compact: sameAuthorCluster(message, messages[index - 1]),
      showDate: index === 0 || !sameDay(message.createdAt, messages[index - 1].createdAt),
    }))
  }, [messages])

  const handleScroll = () => {
    const scroller = scrollRef.current
    if (!scroller) return

    const { scrollTop, scrollHeight, clientHeight } = scroller
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 120)

    if (scrollTop < 120 && hasMore && !isLoading) {
      onLoadMore()
    }
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Start {conversationName}</h2>
          <p className="mt-1 text-sm text-gray-500">
            Send first message, share files, or start thread when work gets specific.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto bg-white"
    >
      <div className="flex justify-center py-2">
        {hasMore && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
            className="gap-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Load older messages
          </Button>
        )}
      </div>

      {isLoading && messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="pb-3">
          {rows.map(({ message, compact, showDate }) => (
            <div key={message.id}>
              {showDate && <DateDivider value={message.createdAt} />}
              <MessageItem
                message={message}
                currentUserId={currentUserId}
                compact={compact}
                onReply={onReply}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
                onOpenThread={onOpenThread}
                onEditMessage={onEditMessage}
                onUnsendMessage={onUnsendMessage}
                onDeleteMessage={onDeleteMessage}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
