'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { chatApi, type ChatAssistMessage } from '@serenity/api'
import { Loader2, Sparkles, X, Check } from 'lucide-react'

type State = 'idle' | 'loading'

export type ChatAiCommandBarProps = {
  open: boolean
  token: string
  conversationContext: ChatAssistMessage[]
  authContext: {
    orgId: string
    userId: string
    role?: string | null
    displayName?: string | null
    email?: string | null
    orgName?: string | null
    orgSlug?: string | null
  }
  onAccept: (suggestedText: string) => void
  onClose: () => void
}

export function ChatAiCommandBar({
  open,
  token,
  conversationContext,
  authContext,
  onAccept,
  onClose,
}: ChatAiCommandBarProps) {
  const [prompt, setPrompt] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setPrompt('')
      setState('idle')
      setError(null)
      setSuggestion(null)
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
      const response = await chatApi.assistWithAi(token, {
        conversationContext,
        prompt: trimmed,
        authContext,
      })
      setSuggestion(response.suggestedContent)
      setState('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI is unavailable right now.')
      setState('idle')
    }
  }, [prompt, state, token, conversationContext, authContext])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void handleSubmit()
      }
    },
    [handleSubmit],
  )

  if (!open) return null

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg shadow-black/5 ring-1 ring-black/5">
      {suggestion ? (
        <div className="flex flex-col">
          <div className="max-h-60 overflow-y-auto p-3 text-sm text-gray-800">
            {suggestion}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-3 py-2">
            <span className="text-xs text-gray-500">AI Suggestion</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSuggestion(null)}
                className="flex h-7 items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <X className="h-3.5 w-3.5" />
                Discard
              </button>
              <button
                type="button"
                onClick={() => onAccept(suggestion)}
                className="flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Check className="h-3.5 w-3.5" />
                Accept
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            </span>
            <input
              ref={inputRef}
              value={prompt}
              disabled={state === 'loading'}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Ask AI to suggest reply, translate...'
              className="flex-1 border-none bg-transparent py-1.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={onClose}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center justify-between border-t border-gray-50 bg-gray-50 px-3 py-2">
            {state === 'loading' ? (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                AI is reading chat...
              </span>
            ) : error ? (
              <span className="text-xs text-red-500">{error}</span>
            ) : (
              <span className="text-xs text-gray-400">↵ Enter to generate · Esc to cancel</span>
            )}

            <button
              type="button"
              disabled={!prompt.trim() || state === 'loading'}
              onClick={() => void handleSubmit()}
              className="flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:bg-blue-700"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate
            </button>
          </div>
        </>
      )}
    </div>
  )
}
