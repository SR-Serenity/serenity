'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { aiApi } from '@serenity/api'
import { Sparkles, X } from 'lucide-react'

type State = 'idle' | 'streaming'

export type WikiAiCommandBarProps = {
  open: boolean
  token: string
  pageId: string
  pageTitle: string
  pageContentMarkdown: string
  authContext: {
    orgId: string
    userId: string
    role?: string | null
    displayName?: string | null
    email?: string | null
    orgName?: string | null
    orgSlug?: string | null
  }
  onPreview: (updatedMarkdown: string, explanation: string) => Promise<void>
  onClose: () => void
}

export function WikiAiCommandBar({
  open,
  token,
  pageTitle,
  pageContentMarkdown,
  authContext,
  onPreview,
  onClose,
}: WikiAiCommandBarProps) {
  const [prompt, setPrompt] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [streamPreview, setStreamPreview] = useState<string>('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false })

  useEffect(() => {
    if (open) {
      setPrompt('')
      setState('idle')
      setError(null)
      setStreamPreview('')
      abortRef.current.aborted = false
      setTimeout(() => inputRef.current?.focus(), 30)
    }
    return () => { abortRef.current.aborted = true }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSubmit = useCallback(async () => {
    const trimmed = prompt.trim()
    if (!trimmed || state === 'streaming') return

    setState('streaming')
    setError(null)
    setStreamPreview('')
    abortRef.current.aborted = false

    const userMessage = [
      `You are editing a wiki page titled "${pageTitle}".`,
      pageContentMarkdown
        ? `Current content:\n\`\`\`\n${pageContentMarkdown}\n\`\`\``
        : '(The page is currently empty.)',
      `\nInstruction: ${trimmed}`,
      '\nReturn ONLY the complete updated markdown content. No explanation, no code fences around the whole response.',
    ].join('\n')

    try {
      let accumulated = ''
      const finalAnswer = await aiApi.streamOnce(token, {
        message: userMessage,
        authContext,
        context: { entrypoint: 'wiki_edit' },
      }, {
        onToken: chunk => {
          if (abortRef.current.aborted) return
          accumulated += chunk
          setStreamPreview(accumulated)
        },
      })

      if (!abortRef.current.aborted) {
        await onPreview(finalAnswer, trimmed)
        onClose()
      }
    } catch (err) {
      if (!abortRef.current.aborted) {
        setError(err instanceof Error ? err.message : 'AI is unavailable right now.')
        setState('idle')
      }
    } finally {
      if (!abortRef.current.aborted) {
        setState('idle')
      }
    }
  }, [prompt, state, token, pageTitle, pageContentMarkdown, authContext, onPreview, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSubmit()
      }
    },
    [handleSubmit],
  )

  if (!open) return null

  return (
    <div className="fixed bottom-8 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 overflow-hidden rounded-xl border border-[#e3e2e0] bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5">
      {/* Streaming preview */}
      {streamPreview && (
        <div className="border-b border-[#f0efed] bg-[#fafaf9] px-4 py-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-violet-500">
            <Sparkles className="h-3 w-3" />
            <span>Generating…</span>
          </div>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-[#37352f] font-[inherit]">
            {streamPreview}
            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded-sm bg-violet-500 align-text-bottom" />
          </pre>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-start gap-2 px-3 pt-3">
        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100">
          <Sparkles className="h-3 w-3 text-violet-600" />
        </span>
        <textarea
          ref={inputRef}
          value={prompt}
          disabled={state === 'streaming'}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Ask AI to edit this page… e.g. "Summarize", "Add a glossary", "Translate to English"'
          rows={2}
          className="flex-1 resize-none border-none bg-transparent text-sm text-[#37352f] outline-none placeholder:text-[#c7c5bf] disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#9b9a97] hover:bg-[#f1f1ef]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
        {error ? (
          <span className="text-xs text-red-500">{error}</span>
        ) : state === 'streaming' ? (
          <span className="text-xs text-[#9b9a97]">Writing — this may take a moment…</span>
        ) : (
          <span className="text-xs text-[#9b9a97]">↵ Enter to generate · Esc to cancel</span>
        )}

        <button
          type="button"
          disabled={!prompt.trim() || state === 'streaming'}
          onClick={() => void handleSubmit()}
          className="flex h-6 items-center gap-1 rounded-md bg-violet-600 px-2.5 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:bg-violet-500"
        >
          <Sparkles className="h-3 w-3" />
          Generate
        </button>
      </div>
    </div>
  )
}
