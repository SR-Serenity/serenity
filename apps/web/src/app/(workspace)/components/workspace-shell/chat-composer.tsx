'use client'

import { Mic, Paperclip, Send, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChatComposer({
  compact,
  prompt,
  sending,
  onPromptChange,
  onSubmit,
}: {
  compact: boolean
  prompt: string
  sending: boolean
  onPromptChange: (value: string) => void
  onSubmit: (value: string) => void
}) {
  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        onSubmit(prompt)
      }}
      className={cn(
        'overflow-hidden border border-slate-200 bg-white shadow-sm focus-within:border-blue-400',
        compact ? 'rounded-xl' : 'rounded-2xl',
      )}
    >
      <textarea
        value={prompt}
        onChange={e => onPromptChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSubmit(prompt)
          }
        }}
        placeholder={compact ? 'Ask Serenity AI...' : 'Do anything with AI...'}
        className={cn(
          'w-full resize-none bg-transparent text-slate-900 outline-none placeholder:text-slate-400'
          , compact ? 'h-20 px-3 py-3 text-sm' : 'min-h-24 px-5 py-4 text-base',
        )}
      />
      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
        <div className="flex items-center gap-1">
          <button type="button" className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50" title="Attach file">
            <Paperclip className="h-4 w-4" />
          </button>
          {!compact && (
            <button type="button" className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50" title="Agent settings">
              <Settings2 className="h-4 w-4" />
            </button>
          )}
          <button type="button" className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50" title="Voice input">
            <Mic className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          {!compact && (
            <button type="button" className="hidden cursor-pointer h-8 items-center rounded-lg px-2 text-sm text-slate-500 hover:bg-slate-50 sm:flex">
              Auto
            </button>
          )}
          <button
            type="submit"
            disabled={!prompt.trim() || sending}
            className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:bg-slate-100 disabled:text-slate-300"
            title="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  )
}
