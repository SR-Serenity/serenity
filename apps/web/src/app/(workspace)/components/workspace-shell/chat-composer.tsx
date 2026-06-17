'use client'

import { Paperclip, Send } from 'lucide-react'
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
        'overflow-hidden border border-gray-200 bg-white shadow-sm transition-colors focus-within:border-gray-400',
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
        placeholder={compact ? 'Ask Copilot...' : 'Ask anything...'}
        className={cn(
          'w-full resize-none bg-transparent text-gray-900 outline-none placeholder:text-gray-400',
          compact ? 'h-20 px-3 py-3 text-sm' : 'min-h-24 px-5 py-4 text-base',
        )}
      />
      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
        <button
          type="button"
          className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <button
          type="submit"
          disabled={!prompt.trim() || sending}
          className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-300"
          title="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  )
}
