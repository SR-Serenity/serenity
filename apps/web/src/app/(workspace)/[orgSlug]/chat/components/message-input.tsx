'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { AlertCircle, FileText, Loader2, Paperclip, Send, Sparkles, X } from 'lucide-react'
import type { ChatAssistMessage, ChatAttachmentDraft, ChatMessage, Member } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { cn } from '@/lib/utils'
import { useCopilotContextStore } from '@/stores/copilot-context-store'

type UploadState = 'uploading' | 'ready' | 'error'

type ComposerAttachment = {
  localId: string
  name: string
  size?: number | null
  state: UploadState
  error?: string
  uploaded?: ChatAttachmentDraft
}

type MentionOption = {
  id: string
  display: string
  isCopilot?: boolean
}

type MessageInputProps = {
  onSend: (content: string, attachmentIds: string[]) => Promise<void>
  onUploadFile?: (file: File) => Promise<ChatAttachmentDraft>
  replyingTo?: ChatMessage | null
  onCancelReply?: () => void
  disabled?: boolean
  placeholder?: string
  members?: Member[]
  conversationContext?: ChatAssistMessage[]
}

function formatBytes(size?: number | null) {
  if (!size) return ''
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function renderHighlighted(text: string) {
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (/^@\w+$/i.test(part)) {
      return (
        <mark key={i} className="rounded bg-violet-100 text-violet-700 not-italic">
          {part}
        </mark>
      )
    }
    return part
  })
}

export function MessageInput(props: MessageInputProps) {
  const {
    onSend,
    onUploadFile,
    replyingTo,
    onCancelReply,
    disabled,
    placeholder = 'Message',
    members = [],
  } = props
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)

  const pendingChatInsert = useCopilotContextStore(s => s.pendingChatInsert)
  const setPendingChatInsert = useCopilotContextStore(s => s.setPendingChatInsert)

  // Consume pending insert from copilot sidebar
  useEffect(() => {
    if (!pendingChatInsert) return
    setContent(pendingChatInsert)
    setPendingChatInsert(null)
    setTimeout(() => {
      resizeTextarea()
      textareaRef.current?.focus()
    }, 0)
  }, [pendingChatInsert])

  const copilotMentioned = /@copilot\b/i.test(content)

  const allOptions: MentionOption[] = [
    { id: 'copilot', display: 'Copilot', isCopilot: true },
    ...members.map(m => ({ id: m.id, display: m.displayName })),
  ]

  const filteredOptions =
    mentionQuery === null
      ? []
      : allOptions.filter(o => o.display.toLowerCase().startsWith(mentionQuery.toLowerCase()))

  const hasPendingUploads = attachments.some(item => item.state === 'uploading')
  const hasFailedUploads = attachments.some(item => item.state === 'error')
  const readyAttachmentIds = attachments.flatMap(item =>
    item.state === 'ready' && item.uploaded?.id ? [item.uploaded.id] : [],
  )
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
    if (mirrorRef.current) mirrorRef.current.style.height = textarea.style.height
  }

  const syncMirrorScroll = () => {
    if (mirrorRef.current && textareaRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const detectMention = (val: string, cursorPos: number) => {
    const before = val.slice(0, cursorPos)
    const match = before.match(/@(\w*)$/)
    if (match) {
      setMentionQuery(match[1])
      setMentionIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (option: MentionOption) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const cursor = textarea.selectionStart ?? content.length
    const before = content.slice(0, cursor)
    const atPos = before.lastIndexOf('@')
    const after = content.slice(cursor)
    const newContent = content.slice(0, atPos) + `@${option.display} ` + after
    setContent(newContent)
    setMentionQuery(null)
    setTimeout(() => {
      const newCursor = atPos + option.display.length + 2
      textarea.selectionStart = newCursor
      textarea.selectionEnd = newCursor
      textarea.focus()
      resizeTextarea()
    }, 0)
  }

  const handleSend = async () => {
    if (!canSend) return
    const nextContent = content.trim()
    const nextAttachmentIds = readyAttachmentIds
    setMentionQuery(null)
    setIsSending(true)
    setError(null)
    try {
      setContent('')
      setAttachments([])
      onCancelReply?.()
      requestAnimationFrame(resizeTextarea)
      textareaRef.current?.focus()
      const sendPromise = onSend(nextContent, nextAttachmentIds)
      setIsSending(false)
      void sendPromise.catch(sendError => {
        setError(sendError instanceof Error ? sendError.message : 'Failed to send message')
      })
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send message')
      setIsSending(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredOptions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setMentionIndex(i => (i + 1) % filteredOptions.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setMentionIndex(i => (i - 1 + filteredOptions.length) % filteredOptions.length)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        insertMention(filteredOptions[mentionIndex])
        return
      }
      if (event.key === 'Escape') {
        setMentionQuery(null)
        return
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  const uploadFile = async (file: File) => {
    const localId = `${file.name}-${file.lastModified}-${crypto.randomUUID()}`
    setAttachments(prev => [...prev, { localId, name: file.name, size: file.size, state: 'uploading' }])
    if (!onUploadFile) {
      setAttachments(prev =>
        prev.map(item =>
          item.localId === localId
            ? { ...item, state: 'error', error: 'Attachment uploads are unavailable' }
            : item,
        ),
      )
      return
    }
    try {
      const uploaded = await onUploadFile(file)
      setAttachments(prev =>
        prev.map(item =>
          item.localId === localId
            ? { ...item, state: 'ready', uploaded, name: uploaded.name, size: uploaded.size }
            : item,
        ),
      )
    } catch (uploadError) {
      setAttachments(prev =>
        prev.map(item =>
          item.localId === localId
            ? { ...item, state: 'error', error: uploadError instanceof Error ? uploadError.message : 'Upload failed' }
            : item,
        ),
      )
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    files.slice(0, 10).forEach(file => void uploadFile(file))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (localId: string) => {
    setAttachments(prev => prev.filter(item => item.localId !== localId))
  }

  useEffect(() => {
    const handler = () => setMentionQuery(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative shrink-0 border-t border-gray-100 bg-white px-3 py-2 sm:px-4">
      <div>
        {replyingTo && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm animate-in fade-in slide-in-from-bottom-1 duration-150">
            <div className="mt-0.5 h-9 w-0.5 shrink-0 rounded-full bg-blue-500" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-blue-700">
                Replying to {replyingTo.author.displayName}
              </div>
              <div className="mt-0.5 line-clamp-2 wrap-break-word text-gray-600">
                {replyingTo.unsentAt ? 'Message unsent' : replyingTo.content || 'Attachment'}
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon-xs" onClick={onCancelReply} title="Cancel reply">
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
                    : 'border-gray-200 bg-gray-50 text-gray-700',
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

        {mentionQuery !== null && filteredOptions.length > 0 && (
          <div className="mb-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Mention
            </div>
            {filteredOptions.map((option, idx) => (
              <button
                key={option.id}
                type="button"
                onMouseDown={e => {
                  e.preventDefault()
                  insertMention(option)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                  idx === mentionIndex ? 'bg-violet-50 text-violet-700' : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                {option.isCopilot ? (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
                    <Sparkles className="size-3.5" />
                  </span>
                ) : (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-[11px] font-semibold text-white">
                    {option.display.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="font-medium">{option.display}</div>
                  {option.isCopilot && (
                    <div className="text-xs text-violet-500">AI assistant · asks AI to reply in chat</div>
                  )}
                </div>
                {option.isCopilot && (
                  <span className="ml-auto shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                    AI
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div
          className={cn(
            'rounded-xl border bg-white shadow-sm transition-colors',
            copilotMentioned
              ? 'border-violet-300 ring-2 ring-violet-100'
              : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100',
          )}
        >
          <div className="relative px-3 py-2.5">
            <div
              ref={mirrorRef}
              aria-hidden
              className="pointer-events-none absolute inset-x-3 inset-y-2.5 overflow-hidden whitespace-pre-wrap wrap-break-word text-sm leading-5 text-gray-900"
              style={{ minHeight: '1.25rem' }}
            >
              {renderHighlighted(content)}
              {'​'}
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={event => {
                const val = event.target.value
                setContent(val)
                resizeTextarea()
                detectMention(val, event.target.selectionStart ?? val.length)
              }}
              onKeyUp={event => {
                detectMention(
                  content,
                  (event.target as HTMLTextAreaElement).selectionStart ?? content.length,
                )
              }}
              onScroll={syncMirrorScroll}
              onInput={resizeTextarea}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isSending}
              rows={1}
              className={cn(
                'relative block min-h-5 w-full resize-none bg-transparent text-sm leading-5 outline-none',
                'caret-gray-900 placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50',
                content ? 'text-transparent' : 'text-gray-900',
              )}
            />
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-2 py-1.5">
            <div className="flex items-center gap-1">
              <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
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

        {copilotMentioned && (
          <div className="mt-1.5 flex items-center gap-1.5 px-1 text-xs text-violet-500">
            <Sparkles className="h-3 w-3 shrink-0" />
            Copilot will reply in this conversation
          </div>
        )}
      </div>
    </div>
  )
}
