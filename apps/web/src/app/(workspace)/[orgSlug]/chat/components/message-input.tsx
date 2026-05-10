'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Paperclip, Send, X } from 'lucide-react'
import type { ChatMessage, ChatAttachmentInput } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { cn } from '@/lib/utils'

type MessageInputProps = {
  onSend: (content: string, attachments: ChatAttachmentInput[]) => Promise<void>
  replyingTo?: ChatMessage | null
  onCancelReply?: () => void
  disabled?: boolean
}

export function MessageInput({
  onSend,
  replyingTo,
  onCancelReply,
  disabled,
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<ChatAttachmentInput[]>([])
  const [isSending, setIsSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    if ((!content.trim() && attachments.length === 0) || isSending) return

    setIsSending(true)
    try {
      await onSend(content.trim(), attachments)
      setContent('')
      setAttachments([])
      onCancelReply?.()
      textareaRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newAttachments: ChatAttachmentInput[] = files.map(file => ({
      kind: 'FILE',
      url: URL.createObjectURL(file),
      name: file.name,
      mimeType: file.type,
      size: file.size,
    }))
    setAttachments(prev => [...prev, ...newAttachments])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="border-t border-divider bg-surface p-4">
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 rounded bg-panel p-2 text-sm">
          <span className="flex-1 text-muted">
            Replying to <span className="font-semibold">{replyingTo.author.displayName}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelReply}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded border border-divider bg-panel px-3 py-2 text-sm"
            >
              <Paperclip className="h-4 w-4 text-muted" />
              <span className="max-w-[200px] truncate text-caption">
                {attachment.name}
              </span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-muted hover:text-caption"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled || isSending}
            rows={1}
            className={cn(
              'w-full resize-none rounded-lg border border-divider bg-panel px-4 py-3 text-sm text-caption',
              'placeholder:text-muted focus:border-focus focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            style={{
              minHeight: '44px',
              maxHeight: '200px',
              height: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${target.scrollHeight}px`
            }}
          />
        </div>

        <div className="flex gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending}
            className="h-11 w-11 p-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleSend}
            disabled={disabled || isSending || (!content.trim() && attachments.length === 0)}
            className="h-11 w-11 p-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
