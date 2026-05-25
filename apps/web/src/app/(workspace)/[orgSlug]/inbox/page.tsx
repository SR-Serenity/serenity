'use client'

import { FormEvent, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  FileText,
  MessageSquare,
  Mic,
  Paperclip,
  Send,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react'

const suggestions = [
  { label: "What's new in my workspace?", icon: Sparkles },
  { label: 'Write meeting agenda', icon: MessageSquare },
  { label: 'Analyze PDFs or images', icon: FileText },
  { label: 'Create a task tracker', icon: CheckCircle2 },
]

type ChatEntry = {
  id: string
  content: string
}

export default function InboxPage() {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [showSuggestions, setShowSuggestions] = useState(true)

  const hasConversation = messages.length > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = prompt.trim()
    if (!value) return

    const nextUserMessage: ChatEntry = {
      id: `user-${Date.now()}`,
      content: value,
    }

    setMessages(current => [...current, nextUserMessage])
    setPrompt('')
    setShowSuggestions(false)
  }

  const composer = (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-2xl border border-[var(--theme-divider-color)] bg-white shadow-sm focus-within:border-blue-500"
    >
      <textarea
        value={prompt}
        onChange={event => setPrompt(event.target.value)}
        placeholder="Do anything with AI..."
        className="min-h-24 w-full resize-none bg-transparent px-5 py-4 text-base text-[var(--theme-caption-color)] outline-none placeholder:text-[var(--theme-darker-color)]"
      />
      <div className="flex items-center justify-between border-t border-[var(--theme-divider-color)] px-4 py-3">
        <div className="flex items-center gap-1">
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--theme-darker-color)] hover:bg-[var(--highlight-hover)] hover:text-[var(--theme-caption-color)]" title="Attach file">
            <Paperclip className="h-4 w-4" />
          </button>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--theme-darker-color)] hover:bg-[var(--highlight-hover)] hover:text-[var(--theme-caption-color)]" title="Agent settings">
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="hidden h-8 items-center rounded-lg px-2 text-sm text-[var(--theme-darker-color)] hover:bg-[var(--highlight-hover)] hover:text-[var(--theme-caption-color)] sm:flex">
            Auto
          </button>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--theme-darker-color)] hover:bg-[var(--highlight-hover)] hover:text-[var(--theme-caption-color)]" title="Voice input">
            <Mic className="h-4 w-4" />
          </button>
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:bg-slate-100 disabled:text-slate-300"
            title="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  )

  return (
    <div className="relative flex h-full min-h-0 bg-white text-slate-900 [color-scheme:light] [--highlight-hover:#f8fafc] [--theme-bg-color:#ffffff] [--theme-button-border:#cbd5e1] [--theme-button-default:#f8fafc] [--theme-caption-color:#0f172a] [--theme-content-color:#0f172a] [--theme-divider-color:#e2e8f0] [--theme-darker-color:#64748b] [--theme-list-row-color:#ffffff] [--theme-panel-color:#ffffff]">
      <main className="flex min-w-0 flex-1 flex-col">
        {hasConversation ? (
          <>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--theme-divider-color)] px-4 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--theme-divider-color)] bg-white text-[var(--theme-caption-color)]">
                <Bot className="h-4 w-4" />
              </span>
              <span className="font-medium text-[var(--theme-caption-color)]">Serenity AI</span>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="mx-auto w-full max-w-3xl space-y-3">
                {messages.map(message => (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl bg-slate-100 px-4 py-1.5 text-sm text-[var(--theme-caption-color)]">
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 px-5 pb-4">
              <div className="mx-auto w-full max-w-3xl">
                {composer}
              </div>
            </div>
          </>
        ) : (
        <div className="flex flex-1 items-center justify-center px-5 py-8">
          <div className="w-full max-w-3xl">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--theme-divider-color)] bg-white text-[var(--theme-caption-color)] shadow-lg shadow-slate-200/70">
                <Bot className="h-8 w-8" />
              </div>
            </div>

            <h2 className="text-center text-3xl font-semibold tracking-normal text-[var(--theme-caption-color)]">
              How can I help you today?
            </h2>

            <div className="mt-7">{composer}</div>

            {showSuggestions && (
              <div className="mt-9">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-[var(--theme-darker-color)]">Get started</p>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="text-[var(--theme-darker-color)] hover:text-[var(--theme-caption-color)]"
                    title="Hide suggestions"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {suggestions.map(suggestion => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => setPrompt(suggestion.label)}
                      className="min-h-17 rounded-xl bg-slate-50 px-3 py-3 text-left transition-colors hover:bg-blue-50"
                    >
                      <suggestion.icon className="h-4 w-4 text-[var(--theme-darker-color)]" />
                      <p className="mt-3 text-sm text-[var(--theme-content-color)]">{suggestion.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </main>
    </div>
  )
}
