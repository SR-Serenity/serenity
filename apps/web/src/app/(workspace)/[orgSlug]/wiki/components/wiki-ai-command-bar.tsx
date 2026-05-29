'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { wikiApi } from '@serenity/api'
import { Loader2, Sparkles, X } from 'lucide-react'

type State = 'idle' | 'loading'

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
  /** Fires with the raw markdown from the AI — parent applies it to the editor */
  onPreview: (updatedMarkdown: string, explanation: string) => Promise<void>
  onClose: () => void
}

export function WikiAiCommandBar({
  open,
  token,
  pageId,
  pageTitle,
  pageContentMarkdown,
  authContext,
  onPreview,
  onClose,
}: WikiAiCommandBarProps) {
  const [prompt, setPrompt] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setPrompt('')
      setState('idle')
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleSubmit = useCallback(async () => {
    const trimmed = prompt.trim()
    if (!trimmed || state === 'loading') return

    setState('loading')
    setError(null)

    try {
      const response = await wikiApi.editWithAi(token, {
        pageId,
        pageTitle,
        pageContentMarkdown,
        prompt: trimmed,
        authContext,
      })
      await onPreview(response.updatedContentMarkdown, response.answer)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI is unavailable right now.')
      setState('idle')
    }
  }, [prompt, state, token, pageId, pageTitle, pageContentMarkdown, authContext, onPreview])

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
    /*
     * Fixed floating bar — no modal, no backdrop.
     * Anchored to the bottom center of the viewport to prevent scroll-jumping when focused.
     */
    <div className="fixed bottom-8 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 overflow-hidden rounded-xl border border-[#e3e2e0] bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5">
      <div className="flex items-start gap-2 px-3 pt-3">
        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100">
          <Sparkles className="h-3 w-3 text-violet-600" />
        </span>
        <textarea
          ref={inputRef}
          value={prompt}
          disabled={state === 'loading'}
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

      <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
        {state === 'loading' ? (
          <span className="flex items-center gap-1.5 text-xs text-[#9b9a97]">
            <Loader2 className="h-3 w-3 animate-spin" />
            AI is thinking…
          </span>
        ) : error ? (
          <span className="text-xs text-red-500">{error}</span>
        ) : (
          <span className="text-xs text-[#9b9a97]">↵ Enter to generate · Esc to cancel</span>
        )}

        <button
          type="button"
          disabled={!prompt.trim() || state === 'loading'}
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
