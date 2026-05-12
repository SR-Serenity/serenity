'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { AlertCircle, FileText, Loader2, Paperclip, Send, X } from 'lucide-react'
import type { ChatAttachmentDraft, ChatMessage } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { cn } from '@/lib/utils'

type UploadState = 'uploading' | 'ready' | 'error'

type ComposerAttachment = {
  localId: string
  name: string
  size?: number | null
  state: UploadState
  error?: string
  uploaded?: ChatAttachmentDraft
}

type MessageInputProps = {
  onSend: (content: string, attachmentIds: string[]) => Promise<void>
  onUploadFile?: (file: File) => Promise<ChatAttachmentDraft>
  replyingTo?: ChatMessage | null
  onCancelReply?: () => void
  disabled?: boolean
  placeholder?: string
}

function formatBytes(size?: number | null) {
  if (!size) return ''
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function MessageInput({
  onSend,
  onUploadFile,
  replyingTo,
  onCancelReply,
  disabled,
  placeholder = 'Message',
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasPendingUploads = attachments.some(item => item.state === 'uploading')
  const hasFailedUploads = attachments.some(item => item.state === 'error')
  const readyAttachmentIds = attachments
    .flatMap(item => item.state === 'ready' && item.uploaded?.id ? [item.uploaded.id] : [])
  const canSend =
    !disabled &&
    !isSending &&
    !hasPendingUploads &&
    !hasFailedUploads &&
    (content.trim().length > 0 || readyAttachmentIds.length > 0)

  const resizeTextarea = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`
  }

  const handleSend = async () => {
    if (!canSend) return

    setIsSending(true)
    setError(null)
    try {
      await onSend(content.trim(), readyAttachmentIds)
      setContent('')
      setAttachments([])
      onCancelReply?.()
      requestAnimationFrame(resizeTextarea)
      textareaRef.current?.focus()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  const uploadFile = async (file: File) => {
    const localId = `${file.name}-${file.lastModified}-${crypto.randomUUID()}`
    setAttachments(prev => [
      ...prev,
      { localId, name: file.name, size: file.size, state: 'uploading' },
    ])

    if (!onUploadFile) {
      setAttachments(prev =>
        prev.map(item =>
          item.localId === localId
            ? { ...item, state: 'error', error: 'Attachment uploads are unavailable' }
            : item
        )
      )
      return
    }

    try {
      const uploaded = await onUploadFile(file)
      setAttachments(prev =>
        prev.map(item =>
          item.localId === localId
            ? { ...item, state: 'ready', uploaded, name: uploaded.name, size: uploaded.size }
            : item
        )
      )
    } catch (uploadError) {
      setAttachments(prev =>
        prev.map(item =>
          item.localId === localId
            ? {
                ...item,
                state: 'error',
                error: uploadError instanceof Error ? uploadError.message : 'Upload failed',
              }
            : item
        )
      )
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    files.slice(0, 10).forEach(file => {
      void uploadFile(file)
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (localId: string) => {
    setAttachments(prev => prev.filter(item => item.localId !== localId))
  }

  return (
    <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
      <div className="mx-auto max-w-5xl">
        {replyingTo && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <span className="text-gray-500">Replying to </span>
              <span className="font-semibold text-gray-900">{replyingTo.author.displayName}</span>
              <span className="ml-2 truncate text-gray-500">{replyingTo.content || 'Message'}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onCancelReply}
              title="Cancel reply"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map(attachment => (
              <div
                key={attachment.localId}
                className={cn(
                  'flex max-w-64 items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                  attachment.state === 'error'
                    ? 'border-red-200 bg-red-50 text-red-600'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                )}
              >
                {attachment.state === 'uploading' ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
                ) : attachment.state === 'error' ? (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{attachment.name}</div>
                  <div className="text-xs text-gray-500">
                    {attachment.state === 'uploading'
                      ? 'Uploading'
                      : attachment.state === 'error'
                        ? attachment.error
                        : formatBytes(attachment.size)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.localId)}
                  className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  title="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => {
              setContent(event.target.value)
              resizeTextarea()
            }}
            onInput={resizeTextarea}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            className={cn(
              'block min-h-12 w-full resize-none bg-transparent px-4 py-3 text-sm leading-5 text-gray-900 outline-none',
              'placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />

          <div className="flex items-center justify-between border-t border-gray-100 px-2 py-2">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isSending}
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              size="icon-lg"
              className="rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              title="Send message"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
