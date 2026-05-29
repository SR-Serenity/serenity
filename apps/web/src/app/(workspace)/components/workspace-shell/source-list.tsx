'use client'

import { ExternalLink, FileText, Globe } from 'lucide-react'
import type { AiSource } from '@serenity/api'

function SourcePill({
  source,
  onOpen,
}: {
  source: AiSource
  onOpen?: (source: AiSource) => void
}) {
  const isWiki = source.type === 'wiki' || source.type === 'wiki_page'
  const hasLink = Boolean(source.url)

  const handleClick = () => {
    if (onOpen) {
      onOpen(source)
    } else if (source.url) {
      window.open(source.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <button
      type="button"
      onClick={hasLink || onOpen ? handleClick : undefined}
      className={
        `group flex w-full items-start gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-left shadow-sm transition-colors ` +
        (hasLink || onOpen ? 'hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer' : 'cursor-default')
      }
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {isWiki ? <FileText className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium leading-5 text-slate-700">
          {source.title || source.url || 'Source'}
        </p>
        {source.snippet && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-400">
            {source.snippet}
          </p>
        )}
      </div>

      {(hasLink || onOpen) && (
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-blue-400" />
      )}
    </button>
  )
}

export function SourceList({
  sources,
  compact = false,
  onOpen,
}: {
  sources: AiSource[]
  compact?: boolean
  onOpen?: (source: AiSource) => void
}) {
  if (sources.length === 0) return null

  return (
    <div className={compact ? 'mt-2 space-y-1.5' : 'mt-3 space-y-1.5'}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {sources.length} source{sources.length !== 1 ? 's' : ''}
      </p>
      <div className="space-y-1">
        {sources.map((source, i) => (
          <SourcePill
            // eslint-disable-next-line react/no-array-index-key
            key={`${source.type}-${i}`}
            source={source}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  )
}
