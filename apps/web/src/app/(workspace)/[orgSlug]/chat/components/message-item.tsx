'use client'

import { useState } from 'react'
import {
  Check,
  Download,
  Edit3,
  FileText,
  MessageSquareReply,
  MoreHorizontal,
  Reply,
  RotateCcw,
  SmilePlus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import type { ChatAttachment, ChatMessage, ChatReaction } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { cn } from '@/lib/utils'

type MessageItemProps = {
  message: ChatMessage
  currentUserId: string
  compact?: boolean
  onReply?: (message: ChatMessage) => void
  onAddReaction?: (messageId: string, emoji: string) => void
  onRemoveReaction?: (messageId: string, emoji: string) => void
  onOpenThread?: (message: ChatMessage) => void
  onEditMessage?: (messageId: string, content: string) => Promise<void> | void
  onUnsendMessage?: (messageId: string) => Promise<void> | void
  onDeleteMessage?: (messageId: string) => Promise<void> | void
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🤔', '👀']

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'U'
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatBytes(size?: number | null) {
  if (!size) return null
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function isImageAttachment(attachment: ChatAttachment) {
  return attachment.kind === 'GIF' || attachment.mimeType?.startsWith('image/')
}

function AttachmentPreview({ attachment }: { attachment: ChatAttachment }) {
  const size = formatBytes(attachment.size)
  const url = attachment.url ?? undefined

  if (url && isImageAttachment(attachment)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 block w-fit overflow-hidden rounded-lg border border-gray-200 bg-white"
      >
        <img
          src={url}
          alt={attachment.name}
          className="max-h-64 max-w-96 object-contain"
        />
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'mt-2 flex max-w-md items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors shadow-sm',
        url ? 'hover:bg-gray-50' : 'pointer-events-none opacity-70'
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-gray-900">{attachment.name}</div>
        <div className="text-xs text-gray-500">{size ?? attachment.mimeType ?? 'File'}</div>
      </div>
      {url && <Download className="h-4 w-4 shrink-0 text-gray-400" />}
    </a>
  )
}

function ReplyPreview({ message }: { message: ChatMessage }) {
  const replyTo = message.replyTo
  if (!replyTo) return null

  const preview = replyTo.unsentAt
    ? 'Message unsent'
    : replyTo.content || 'Attachment'

  return (
    <div className="mb-1.5 max-w-xl rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-xs animate-in fade-in slide-in-from-bottom-1 duration-150">
      <div className="flex min-w-0 items-start gap-2">
        <div className="mt-0.5 h-8 w-0.5 shrink-0 rounded-full bg-blue-500" />
        <div className="min-w-0">
          <div className="truncate font-semibold text-gray-800">
            {replyTo.author.displayName}
          </div>
          <div className={cn(
            'line-clamp-2 break-words',
            replyTo.unsentAt ? 'italic text-gray-500' : 'text-gray-500',
          )}>
            {preview}
          </div>
        </div>
      </div>
    </div>
  )
}

export function MessageItem({
  message,
  currentUserId,
  compact = false,
  onReply,
  onAddReaction,
  onRemoveReaction,
  onOpenThread,
  onEditMessage,
  onUnsendMessage,
  onDeleteMessage,
}: MessageItemProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [isSaving, setIsSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isOwnMessage = message.authorId === currentUserId
  const isUnsent = Boolean(message.unsentAt)
  const replyCount = message.replies?.length ?? 0
  const groupedReactions = message.reactions.reduce(
    (acc: Record<string, ChatReaction[]>, reaction: ChatReaction) => {
      acc[reaction.emoji] = [...(acc[reaction.emoji] ?? []), reaction]
      return acc
    },
    {}
  )

  const handleReactionClick = (emoji: string) => {
    if (isUnsent) return
    const existingReaction = message.reactions.find(
      reaction => reaction.emoji === emoji && reaction.userId === currentUserId
    )
    if (existingReaction) {
      onRemoveReaction?.(message.id, emoji)
    } else {
      onAddReaction?.(message.id, emoji)
    }
    setShowEmojiPicker(false)
  }

  const saveEdit = async () => {
    const nextContent = draft.trim()
    if (!nextContent || nextContent === message.content) {
      setIsEditing(false)
      setDraft(message.content)
      return
    }

    setIsSaving(true)
    setActionError(null)
    try {
      await onEditMessage?.(message.id, nextContent)
      setIsEditing(false)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to edit message')
    } finally {
      setIsSaving(false)
    }
  }

  const runAction = async (action: () => Promise<void> | void, fallback: string) => {
    setActionError(null)
    setShowMenu(false)
    try {
      await action()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : fallback)
    }
  }

  const isCopilot = Boolean(message.isCopilot)

  if (isCopilot) {
    return (
      <div className="group relative px-3 py-1 sm:px-4">
        <div className="flex w-full gap-2.5">
          {!compact && (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
          )}
          {compact && (
            <div className="w-8 shrink-0 text-right text-[11px] leading-5 text-transparent group-hover:text-gray-400">
              {formatTime(message.createdAt)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {!compact && (
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="truncate font-semibold text-violet-700">Copilot</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI
                </span>
                <span className="shrink-0 text-xs text-gray-400">{formatTime(message.createdAt)}</span>
              </div>
            )}
            <div className="whitespace-pre-wrap wrap-break-word text-sm leading-5 text-gray-800">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative px-3 py-1 transition-colors hover:bg-gray-50/80 sm:px-4">
      <div className="flex w-full gap-2.5">
        {!compact && (
          <div
            className={cn(
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white shadow-sm',
              isOwnMessage ? 'bg-blue-600' : 'bg-teal-500'
            )}
          >
            {initials(message.author.displayName)}
          </div>
        )}

        {compact && <div className="w-8 shrink-0 text-right text-[11px] leading-5 text-transparent group-hover:text-gray-400">{formatTime(message.createdAt)}</div>}

        <div className="min-w-0 flex-1">
          {!compact && (
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate font-semibold text-gray-900">{message.author.displayName}</span>
              <span className="shrink-0 text-xs text-gray-400">{formatTime(message.createdAt)}</span>
              {message.editedAt && !isUnsent && <span className="text-xs text-gray-400">edited</span>}
            </div>
          )}

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                className="min-h-20 w-full resize-none rounded-lg border border-blue-500 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-2 ring-blue-100"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveEdit()}
                  disabled={isSaving}
                  className="gap-1 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false)
                    setDraft(message.content)
                  }}
                  disabled={isSaving}
                  className="gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {!isUnsent && <ReplyPreview message={message} />}

              <div
                className={cn(
                  'whitespace-pre-wrap wrap-break-word text-sm leading-5',
                  isUnsent ? 'italic text-gray-500' : 'text-gray-800'
                )}
              >
                {isUnsent ? 'Message unsent' : message.content}
              </div>

              {!isUnsent && message.attachments.length > 0 && (
                <div className="mt-1.5 space-y-1.5">
                  {message.attachments.map(attachment => (
                    <AttachmentPreview key={attachment.id} attachment={attachment} />
                  ))}
                </div>
              )}
            </>
          )}

          {!isUnsent && Object.keys(groupedReactions).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.entries(groupedReactions).map(([emoji, reactions]) => {
                const hasReacted = reactions.some(reaction => reaction.userId === currentUserId)
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReactionClick(emoji)}
                    className={cn(
                      'flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition-colors',
                      hasReacted
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    )}
                    title={reactions.map(reaction => reaction.user?.displayName).filter(Boolean).join(', ')}
                  >
                    <span>{emoji}</span>
                    <span>{reactions.length}</span>
                  </button>
                )
              })}
            </div>
          )}

          {!isUnsent && replyCount > 0 && (
            <button
              type="button"
              onClick={() => onOpenThread?.(message)}
              className="mt-1.5 inline-flex items-center gap-1 rounded-md px-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
            >
              <Reply className="h-3 w-3" />
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}

          {actionError && (
            <div className="mt-2 text-xs text-red-600">{actionError}</div>
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="absolute right-5 top-0 hidden items-center rounded-lg border border-gray-200 bg-white p-1 shadow-lg group-hover:flex">
          {!isUnsent && (
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowEmojiPicker(prev => !prev)}
                title="Add reaction"
              >
                <SmilePlus className="h-4 w-4" />
              </Button>
              {showEmojiPicker && (
                <div className="absolute right-0 top-9 z-20 flex gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
                  {QUICK_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReactionClick(emoji)}
                      className="rounded-md p-1 text-lg transition-colors hover:bg-gray-100"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!isUnsent && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onReply?.(message)}
              title="Reply"
            >
              <Reply className="h-4 w-4" />
            </Button>
          )}
          {!isUnsent && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenThread?.(message)}
              title="Thread"
            >
              <MessageSquareReply className="h-4 w-4" />
            </Button>
          )}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowMenu(prev => !prev)}
              title="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-xl">
                {isOwnMessage && !isUnsent && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      setDraft(message.content)
                      setIsEditing(true)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-gray-700 hover:bg-gray-100"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit message
                  </button>
                )}
                {isOwnMessage && !isUnsent && (
                  <button
                    type="button"
                    onClick={() => void runAction(
                      () => onUnsendMessage?.(message.id),
                      'Failed to unsend message'
                    )}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-gray-700 hover:bg-gray-100"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Unsend
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void runAction(
                    () => onDeleteMessage?.(message.id),
                    'Failed to delete message'
                  )}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete for me
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
