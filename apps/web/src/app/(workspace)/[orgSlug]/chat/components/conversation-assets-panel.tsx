'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { chatApi, type ChatAttachment } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'

type ConversationAssetsPanelProps = {
  token: string
  conversationId: string
  kind: 'ALL' | 'DOC'
}

function formatBytes(size?: number | null) {
  if (!size) return 'File'
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function ConversationAssetsPanel({
  token,
  conversationId,
  kind,
}: ConversationAssetsPanelProps) {
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAssets = useCallback(async (cursor?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await chatApi.listConversationAssets(token, conversationId, {
        kind,
        cursor,
        limit: 50,
      })
      setAttachments(prev => cursor ? [...prev, ...response.attachments] : response.attachments)
      setNextCursor(response.nextCursor ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load files')
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, kind, token])

  useEffect(() => {
    setAttachments([])
    setNextCursor(null)
    void loadAssets()
  }, [conversationId, kind, loadAssets])

  if (isLoading && attachments.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error && attachments.length === 0) {
    return <div className="p-4 text-sm text-red-600">{error}</div>
  }

  if (attachments.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500">
        No {kind === 'DOC' ? 'docs' : 'files'} found
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-white p-3">
      <div className="grid gap-2">
        {attachments.map(attachment => (
          <a
            key={attachment.id}
            href={attachment.url ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-gray-900">{attachment.name}</div>
              <div className="truncate text-xs text-gray-500">
                {formatBytes(attachment.size)}
                {attachment.mimeType ? ` - ${attachment.mimeType}` : ''}
              </div>
            </div>
            <Download className="h-4 w-4 shrink-0 text-gray-400" />
          </a>
        ))}
      </div>

      {nextCursor && (
        <div className="flex justify-center py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void loadAssets(nextCursor)}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
