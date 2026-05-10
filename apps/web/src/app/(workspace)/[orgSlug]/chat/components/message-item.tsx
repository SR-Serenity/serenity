'use client'

import { useState } from 'react'
import { MoreVertical, Reply, Smile } from 'lucide-react'
import type { ChatMessage, ChatReaction } from '@serenity/api'
import { cn } from '@/lib/utils'
import { Button } from '@/app/shared/components/ui/button'

type MessageItemProps = {
  message: ChatMessage
  currentUserId: string
  onReply?: (message: ChatMessage) => void
  onAddReaction?: (messageId: string, emoji: string) => void
  onRemoveReaction?: (messageId: string, emoji: string) => void
  onOpenThread?: (message: ChatMessage) => void
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🤔', '👀']

export function MessageItem({
  message,
  currentUserId,
  onReply,
  onAddReaction,
  onRemoveReaction,
  onOpenThread,
}: MessageItemProps) {
  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const isOwnMessage = message.authorId === currentUserId

  const handleReactionClick = (emoji: string) => {
    const existingReaction = message.reactions.find(
      (r: ChatReaction) => r.emoji === emoji && r.userId === currentUserId
    )
    if (existingReaction) {
      onRemoveReaction?.(message.id, emoji)
    } else {
      onAddReaction?.(message.id, emoji)
    }
    setShowEmojiPicker(false)
  }

  const groupedReactions = message.reactions.reduce((acc: Record<string, ChatReaction[]>, reaction: ChatReaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = []
    }
    acc[reaction.emoji].push(reaction)
    return acc
  }, {})

  const replyCount = message.replies?.length ?? 0

  return (
    <div
      className={cn(
        'group relative px-4 py-2 hover:bg-hover',
        isOwnMessage && 'bg-accent/5'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false)
        setShowEmojiPicker(false)
      }}
    >
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {message.author.displayName.slice(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline gap-2">
            <span className="font-semibold text-caption">
              {message.author.displayName}
            </span>
            <span className="text-xs text-muted">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="text-sm text-caption whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 rounded border border-divider bg-panel p-2 text-sm"
                >
                  {attachment.kind === 'GIF' ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="max-h-48 rounded"
                    />
                  ) : (
                    <>
                      <span className="flex-1 truncate text-caption">
                        {attachment.name}
                      </span>
                      {attachment.size && (
                        <span className="text-xs text-muted">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {Object.keys(groupedReactions).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(groupedReactions).map(([emoji, reactions]) => {
                const hasReacted = reactions.some((r: ChatReaction) => r.userId === currentUserId)
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReactionClick(emoji)}
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                      hasReacted
                        ? 'border-accent bg-accent/10 text-accent-foreground'
                        : 'border-divider bg-panel text-muted hover:bg-hover'
                    )}
                    title={reactions.map((r: ChatReaction) => r.user?.displayName).join(', ')}
                  >
                    <span>{emoji}</span>
                    <span>{reactions.length}</span>
                  </button>
                )
              })}
            </div>
          )}

          {replyCount > 0 && (
            <button
              onClick={() => onOpenThread?.(message)}
              className="mt-2 flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <Reply className="h-3 w-3" />
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {showActions && (
        <div className="absolute right-4 top-2 flex items-center gap-1 rounded border border-divider bg-surface p-1 shadow-sm">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="h-7 w-7 p-0"
            >
              <Smile className="h-4 w-4" />
            </Button>
            {showEmojiPicker && (
              <div className="absolute right-0 top-full z-10 mt-1 flex gap-1 rounded border border-divider bg-surface p-2 shadow-lg">
                {QUICK_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReactionClick(emoji)}
                    className="rounded p-1 text-lg hover:bg-hover"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReply?.(message)}
            className="h-7 w-7 p-0"
          >
            <Reply className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
