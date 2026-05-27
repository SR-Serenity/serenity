'use client'

import React, {
  useEffect,
  useRef,
  useState,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { useRouter, useSearchParams } from 'next/navigation'
import { aiApi } from '@serenity/api'
import type { AiSessionMessage } from '@serenity/api'
import {
  Bot,
  CheckCircle2,
  FileText,
  MessageSquare,
  Mic,
  Paperclip,
  Plus,
  Send,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

const suggestions = [
  { label: "What's new in my workspace?", icon: Sparkles },
  { label: 'Write meeting agenda', icon: MessageSquare },
  { label: 'Analyze PDFs or images', icon: FileText },
  { label: 'Create a task tracker', icon: CheckCircle2 },
]

type LocalMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  pending?: boolean
  sources?: unknown
  proposedActions?: { type: string }[]
}

function MarkdownContent({ content, pending }: { content: string; pending?: boolean }) {
  if (pending) {
    return (
      <span className="flex items-center gap-1.5 text-slate-400">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
      </span>
    )
  }
  return (
    <div className="prose prose-sm prose-slate max-w-none [&_p:last-child]:mb-0 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:my-1 [&_ol]:my-1">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default function InboxPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionParam = searchParams.get('session')

  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  const currentOrg = useAuthStore(s => s.currentOrg)

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [loadingSession, setLoadingSession] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const hasConversation = messages.length > 0

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Load session from URL param
  useEffect(() => {
    if (!token || !sessionParam) {
      setActiveSessionId(null)
      setMessages([])
      setShowSuggestions(true)
      return
    }
    if (sessionParam === activeSessionId) return

    setLoadingSession(true)
    aiApi.getSession(token, sessionParam)
      .then(session => {
        setActiveSessionId(session.id)
        setMessages(
          session.messages.map((m: AiSessionMessage) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            sources: m.sources,
            proposedActions: m.proposedActions as { type: string }[] | undefined,
          })),
        )
        setShowSuggestions(false)
      })
      .catch(() => {
        router.replace(window.location.pathname)
      })
      .finally(() => setLoadingSession(false))
  }, [token, sessionParam])

  async function sendPrompt(value: string) {
    const content = value.trim()
    if (!content || sending) return

    const authReady = token && user && currentOrg
    if (!authReady) return

    const pendingId = `assistant-${Date.now()}`
    setMessages(prev => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content },
      { id: pendingId, role: 'assistant', content: '', pending: true },
    ])
    setPrompt('')
    setShowSuggestions(false)
    setSending(true)

    // Ensure we have a session
    let sessionId = activeSessionId
    if (!sessionId) {
      try {
        const session = await aiApi.createSession(token, 'New chat')
        sessionId = session.id
        setActiveSessionId(session.id)
        router.replace(`?session=${session.id}`)
      } catch {
        setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, content: 'Failed to create session.', pending: false } : m))
        setSending(false)
        return
      }
    }

    // Save user message to DB (non-blocking)
    void aiApi.appendMessages(token, sessionId, [{ role: 'user', content }]).catch(() => undefined)

    try {
      const history = messages
        .filter(m => !m.pending)
        .map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content })

      const response = await aiApi.chat(token, {
        sessionId,
        messages: history,
        authContext: {
          orgId: currentOrg.id,
          userId: user.id,
          role: currentOrg.role,
        },
        context: { entrypoint: 'workspace_panel' },
      })

      setMessages(prev =>
        prev.map(m =>
          m.id === pendingId
            ? { ...m, content: response.answer, pending: false, sources: response.sources, proposedActions: response.proposedActions }
            : m,
        ),
      )

      void aiApi.appendMessages(token, sessionId, [
        { role: 'assistant', content: response.answer, sources: response.sources, proposedActions: response.proposedActions },
      ]).catch(() => undefined)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Serenity AI is unavailable.'
      setMessages(prev =>
        prev.map(m => m.id === pendingId ? { ...m, content: msg, pending: false } : m),
      )
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void sendPrompt(prompt)
  }

  const composer = (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-blue-400"
    >
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void sendPrompt(prompt)
          }
        }}
        placeholder="Do anything with AI..."
        className="min-h-24 w-full resize-none bg-transparent px-5 py-4 text-base text-slate-900 outline-none placeholder:text-slate-400"
      />
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <div className="flex items-center gap-1">
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50" title="Attach file">
            <Paperclip className="h-4 w-4" />
          </button>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50" title="Agent settings">
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="hidden h-8 items-center rounded-lg px-2 text-sm text-slate-500 hover:bg-slate-50 sm:flex">
            Auto
          </button>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50" title="Voice input">
            <Mic className="h-4 w-4" />
          </button>
          <button
            type="submit"
            disabled={!prompt.trim() || sending}
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
    <div className="relative flex h-full min-h-0 bg-white text-slate-900 scheme-light">
      <main className="flex min-w-0 flex-1 flex-col">
        {loadingSession ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : hasConversation ? (
          <>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 px-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
                <Bot className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-slate-700">Serenity AI</span>
              <div className="flex-1" />
              <a
                href="?"
                onClick={e => { e.preventDefault(); router.push(window.location.pathname) }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
              >
                <Plus className="h-3.5 w-3.5" />
                New chat
              </a>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="mx-auto w-full max-w-3xl space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {message.role === 'assistant' && (
                      <span className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Bot className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div
                      className={cn(
                        'max-w-[82%] rounded-2xl px-4 py-2 text-sm',
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-50 text-slate-800 ring-1 ring-slate-200',
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <MarkdownContent content={message.content} pending={message.pending} />
                      ) : (
                        <p className="whitespace-pre-wrap leading-5">{message.content}</p>
                      )}
                      {!message.pending && message.proposedActions && message.proposedActions.length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs">
                          {message.proposedActions.map((action, i) => (
                            <div key={`${action.type}-${i}`} className="font-medium text-blue-700">
                              Proposed: {action.type.replaceAll('_', ' ')}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
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
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg shadow-slate-200/70">
                  <Bot className="h-8 w-8 text-slate-600" />
                </div>
              </div>

              <h2 className="text-center text-3xl font-semibold tracking-normal text-slate-900">
                How can I help you today?
              </h2>

              <div className="mt-7">{composer}</div>

              {showSuggestions && (
                <div className="mt-9">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-slate-500">Get started</p>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="text-slate-400 hover:text-slate-600"
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
                        <suggestion.icon className="h-4 w-4 text-slate-500" />
                        <p className="mt-3 text-sm text-slate-700">{suggestion.label}</p>
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
