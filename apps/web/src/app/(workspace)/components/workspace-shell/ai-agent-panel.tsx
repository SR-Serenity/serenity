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
import { cn } from '@/lib/utils'

const suggestions = [
  { label: "What's new in my workspace?", icon: Sparkles },
  { label: 'Write meeting agenda', icon: MessageSquare },
  { label: 'Analyze PDFs or images', icon: FileText },
  { label: 'Create a task tracker', icon: CheckCircle2 },
]

type ChatEntry = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function createAssistantReply(prompt: string): ChatEntry {
  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: `I can help with "${prompt}". Backend AI streaming is not connected yet, so this is a local draft response.`,
  }
}

export function AiAgentPanelContent({
  compact = false,
}: {
  basePath?: string
  compact?: boolean
}) {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [showSuggestions, setShowSuggestions] = useState(true)

  const hasConversation = messages.length > 0

  function startNewConversation() {
    setMessages([])
    setPrompt('')
    setShowSuggestions(true)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = prompt.trim()
    if (!value) return

    const userMessage: ChatEntry = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: value,
    }

    setMessages(current => [...current, userMessage, createAssistantReply(value)])
    setPrompt('')
    setShowSuggestions(false)
  }

  const composer = (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-blue-400',
        compact ? 'rounded-xl' : 'rounded-2xl',
      )}
    >
      <textarea
        value={prompt}
        onChange={event => setPrompt(event.target.value)}
        placeholder={compact ? 'Ask about this page' : 'Do anything with AI...'}
        className={cn(
          'w-full resize-none bg-transparent text-slate-900 outline-none placeholder:text-slate-400',
          compact ? 'min-h-20 px-3 py-3 text-sm' : 'min-h-24 px-5 py-4 text-base',
        )}
      />
      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
        <div className="flex items-center gap-1">
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900" title="Attach file">
            <Paperclip className="h-4 w-4" />
          </button>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900" title="Agent settings">
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {!compact && (
            <button type="button" className="h-8 rounded-lg px-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900">
              Auto
            </button>
          )}
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900" title="Voice input">
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
    <div className="flex h-full min-h-0 flex-col text-slate-900 [color-scheme:light]">
      <div className="flex shrink-0 items-center justify-between pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#2f6fed] shadow-sm ring-1 ring-blue-100">
            <Bot className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#20345f]">Serenity AI</p>
            <p className="text-xs text-[#7c8bad]">Automatic</p>
          </div>
        </div>
        <button
          type="button"
          onClick={startNewConversation}
          className="h-8 rounded-lg px-2 text-xs font-medium text-[#2f6fed] hover:bg-white"
        >
          New chat
        </button>
      </div>

      {hasConversation ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            <div className="space-y-3">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-5',
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 shadow-sm ring-1 ring-blue-100',
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="shrink-0 pt-3">{composer}</div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setPrompt('Summarize this page')}
              className="flex h-10 w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-3 text-left text-sm text-slate-600 shadow-sm hover:border-blue-200"
            >
              <MessageSquare className="h-4 w-4 text-slate-500" />
              Summarize this page
            </button>
            <button
              type="button"
              onClick={() => setPrompt('Suggest questions about this page')}
              className="flex h-10 w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-3 text-left text-sm text-slate-600 shadow-sm hover:border-blue-200"
            >
              <MessageSquare className="h-4 w-4 text-slate-500" />
              Suggest questions...
            </button>
          </div>

          {showSuggestions && (
            <div className="mt-5 rounded-xl bg-[#fff0e8] p-4 ring-1 ring-orange-100">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Conversation history</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    Serenity will remember your conversations so you can return to them later.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/60 text-slate-500 hover:bg-white"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-2">
                {suggestions.slice(0, compact ? 2 : 4).map(suggestion => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => setPrompt(suggestion.label)}
                    className="flex items-center gap-2 rounded-lg bg-white/70 px-2 py-2 text-left text-sm text-slate-700 hover:bg-white"
                  >
                    <suggestion.icon className="h-4 w-4 text-slate-500" />
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5">{composer}</div>
        </div>
      )}
    </div>
  )
}

export function AiAgentMiniPanelContent() {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatEntry[]>([])

  function sendPrompt(value: string) {
    const content = value.trim()
    if (!content) return

    const userMessage: ChatEntry = {
      id: `mini-user-${Date.now()}`,
      role: 'user',
      content,
    }

    setMessages(current => [...current, userMessage, createAssistantReply(content)])
    setPrompt('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    sendPrompt(prompt)
  }

  return (
    <div className="flex h-full min-h-0 flex-col text-slate-900 [color-scheme:light]">
      <div className="shrink-0 space-y-2">
        <button
          type="button"
          onClick={() => sendPrompt('Summarize this page')}
          className="flex h-10 w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-3 text-left text-sm text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:text-slate-900"
        >
          <MessageSquare className="h-4 w-4 text-slate-500" />
          <span className="truncate">Summarize this page</span>
        </button>
        <button
          type="button"
          onClick={() => sendPrompt('Suggest questions about this page')}
          className="flex h-10 w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-3 text-left text-sm text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:text-slate-900"
        >
          <MessageSquare className="h-4 w-4 text-slate-500" />
          <span className="truncate">Suggest questions...</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        {messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map(message => (
              <div
                key={message.id}
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-5',
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-700 shadow-sm ring-1 ring-blue-100',
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Page helper</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Ask a quick question or use a shortcut without leaving your current work.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-blue-400"
      >
        <textarea
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          placeholder="Ask about this page"
          className="h-20 w-full resize-none bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
          <div className="flex items-center gap-1">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900" title="Attach file">
              <Paperclip className="h-4 w-4" />
            </button>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900" title="Voice input">
              <Mic className="h-4 w-4" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:bg-slate-100 disabled:text-slate-300"
            title="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
