'use client'

import { Paperclip, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChatComposer({
  compact,
  prompt,
  sending,
  onPromptChange,
  onSubmit,
  lightSurface = false,
}: {
  compact: boolean
  prompt: string
  sending: boolean
  onPromptChange: (value: string) => void
  onSubmit: (value: string) => void
  lightSurface?: boolean
}) {
  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        onSubmit(prompt)
      }}
      className={cn(
        'overflow-hidden',
        compact ? 'rounded-xl' : 'rounded-2xl',
        lightSurface ? 'serenity-composer-light' : 'serenity-composer',
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
          'w-full resize-none bg-transparent outline-none',
          lightSurface
            ? 'text-gray-900 placeholder:text-gray-400'
            : 'text-foreground placeholder:text-muted-foreground',
          compact ? 'h-20 px-3 py-3 text-sm' : 'min-h-24 px-5 py-4 text-base',
        )}
      />
      <div className={cn(
        'flex items-center justify-between px-3 py-2',
        lightSurface
          ? 'border-t border-gray-100'
          : 'border-t border-border',
      )}>
        <button
          type="button"
          className={cn(
            'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150',
            lightSurface
              ? 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              : 'text-muted-foreground hover:bg-popup-hover hover:text-foreground',
          )}
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <button
          type="submit"
          disabled={!prompt.trim() || sending}
          className={cn(
            'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all duration-150 active:scale-95',
            lightSurface
              ? 'bg-gray-900 text-white hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-300'
              : 'bg-foreground text-background hover:opacity-85 disabled:opacity-30',
          )}
          title="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  )
}
