'use client'

import React, {
  useEffect,
  useRef,
  useState,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { aiApi, calendarApi, wikiApi } from '@serenity/api'
import type { AiProposedAction, AiProposedActionType, AiSessionMessage } from '@serenity/api'
import {
  Bot,
  CheckCircle2,
  FileText,
  MessageSquare,
  Mic,
  Paperclip,
  PanelRightClose,
  Plus,
  Send,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useAiAgentStore } from '@/stores/ai-agent-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { ProposedActionCard } from '@/app/(workspace)/components/workspace-shell/proposed-action-card'

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
  sources?: import('@serenity/api').AiSource[]
  proposedActions?: AiProposedAction[]
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

export default function CopilotPage() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionParam = searchParams.get('session')
  const fromParam = searchParams.get('from')

  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  const currentOrg = useAuthStore(s => s.currentOrg)

  const {
    activeSessionId,
    sessions,
    messages,
    prompt,
    sending,
    loadingSession,
    setSessions,
    setActiveSessionId,
    setMessages,
    setPrompt,
    setSending,
    setLoadingSession,
    resetConversation,
  } = useAiAgentStore()
  const [showSuggestions, setShowSuggestions] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const hasConversation = messages.length > 0

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (!token) return
    void aiApi.listSessions(token).then(res => setSessions(res.sessions)).catch(() => undefined)
  }, [setSessions, token])

  // Load session from URL param
  useEffect(() => {
    if (!token) {
      resetConversation()
      setShowSuggestions(true)
      return
    }
    if (!sessionParam) {
      setShowSuggestions(messages.length === 0)
      return
    }
    if (sessionParam === activeSessionId) return

    setLoadingSession(true)
    aiApi.getSession(token, sessionParam)
      .then(session => {
        setActiveSessionId(session.id)
        const loaded = session.messages.map((m: AiSessionMessage) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources ?? undefined,
          proposedActions: (m.proposedActions ?? undefined) as AiProposedAction[] | undefined,
        }))
        // Find the last message that has unresolved proposals — all earlier ones are superseded
        let lastActiveId = ''
        for (let i = loaded.length - 1; i >= 0; i--) {
          if (loaded[i].proposedActions?.some(a => a.status !== 'confirmed' && a.status !== 'rejected' && a.status !== 'superseded')) {
            lastActiveId = loaded[i].id
            break
          }
        }
        setMessages(lastActiveId ? supersedePending(loaded, lastActiveId) : loaded)
        setShowSuggestions(false)
      })
      .catch(() => {
        router.replace(window.location.pathname)
      })
      .finally(() => setLoadingSession(false))
  }, [activeSessionId, messages.length, resetConversation, router, sessionParam, setActiveSessionId, setLoadingSession, setMessages, token])

  function supersedePending(msgs: LocalMessage[], keepMessageId: string): LocalMessage[] {
    return msgs.map(m => {
      if (m.id === keepMessageId || !m.proposedActions) return m
      const hasActive = m.proposedActions.some(
        a => a.status !== 'confirmed' && a.status !== 'rejected' && a.status !== 'superseded',
      )
      if (!hasActive) return m
      return {
        ...m,
        proposedActions: m.proposedActions.map(a =>
          a.status !== 'confirmed' && a.status !== 'rejected'
            ? { ...a, status: 'superseded' as const }
            : a,
        ),
      }
    })
  }

  function persistActionStatus(
    messageId: string,
    actions: AiProposedAction[],
    index: number,
    status: 'confirmed' | 'rejected',
    editedAction: AiProposedAction,
  ) {
    const updated = actions.map((a, i) => i === index ? { ...editedAction, status } : a)
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, proposedActions: updated } : m))
    if (activeSessionId && token) {
      void aiApi.updateMessage(token, activeSessionId, messageId, { proposedActions: updated }).catch(() => undefined)
    }
  }

  async function executeAction(action: AiProposedAction): Promise<void> {
    if (!token || !currentOrg) throw new Error('Not authenticated')
    const p = action.payload as Record<string, unknown>
    if (action.type === 'CREATE_MEETING' || action.type === 'BOOK_ROOM') {
      await calendarApi.createItem(token, {
        type: 'MEETING',
        visibility: (p.visibility as 'COMPANY' | 'PERSONAL') ?? 'COMPANY',
        title: String(p.title ?? 'New meeting'),
        startAt: p.startAt as string | undefined,
        endAt: p.endAt as string | undefined,
        location: p.location as string | undefined,
        attendeeIds: (p.attendeeIds as string[]) ?? [],
        roomId: p.roomId as string | undefined,
      })
    } else if (action.type === 'CREATE_TASK') {
      const assigneeIds = p.assigneeId ? [p.assigneeId as string] : (p.attendeeIds as string[] | undefined) ?? []
      await calendarApi.createItem(token, {
        type: 'TASK',
        visibility: (p.visibility as 'COMPANY' | 'PERSONAL') ?? 'COMPANY',
        title: String(p.title ?? 'New task'),
        descriptionMarkdown: (p.description as string | undefined) ?? undefined,
        dueDate: p.dueDate as string | undefined,
        attendeeIds: assigneeIds,
      })
    } else if (action.type === 'CREATE_WIKI_PAGE') {
      await wikiApi.createPage(token, {
        title: String(p.title ?? 'New page'),
        visibility: 'WORKSPACE',
        contentMarkdown: p.contentMarkdown as string | undefined,
      })
    } else if (action.type === 'EDIT_WIKI_PAGE') {
      const pageId = String(p.pageId ?? '')
      if (!pageId) throw new Error('No page ID')
      await wikiApi.updatePage(token, pageId, {
        title: p.title as string | undefined,
        contentMarkdown: p.contentMarkdown as string | undefined,
      })
    }
  }

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
        setSessions(prev => [
          { id: session.id, title: session.title, orgId: session.orgId, userId: session.userId, preview: null, createdAt: session.createdAt, updatedAt: session.updatedAt },
          ...prev,
        ])
        const query = new URLSearchParams(searchParams.toString())
        query.set('session', session.id)
        router.replace(`/${params.orgSlug}/copilot?${query.toString()}`)
      } catch {
        setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, content: 'Failed to create session.', pending: false } : m))
        setSending(false)
        return
      }
    }

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

      setMessages(prev => {
        const withResponse = prev.map(m =>
          m.id === pendingId
            ? { ...m, content: response.answer, pending: false, proposedActions: response.proposedActions }
            : m,
        )
        // Supersede any pending proposals from earlier messages now that we have a new response
        return response.proposedActions?.length
          ? supersedePending(withResponse, pendingId)
          : supersedePending(withResponse, '')
      })

      void aiApi.appendMessages(token, sessionId, [
        { role: 'assistant', content: response.answer, sources: response.sources, proposedActions: response.proposedActions },
      ])
        .then(() => aiApi.listSessions(token).then(res => setSessions(res.sessions)))
        .catch(() => undefined)
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

  function collapseToAddon() {
    useWorkspaceStore.getState().setCopilotDisplayMode('addon')
    useWorkspaceStore.getState().requestOpenAiPanelAfterNavigation()
    const fallback = `/${params.orgSlug}/dashboard`
    const target = fromParam && fromParam.startsWith(`/${params.orgSlug}/`) && !fromParam.includes('/copilot')
      ? fromParam
      : fallback
    router.push(target)
  }

  async function openSession(sessionId: string) {
    if (!token || sessionId === activeSessionId) return
    setLoadingSession(true)
    try {
      const session = await aiApi.getSession(token, sessionId)
      setActiveSessionId(session.id)
      setMessages(session.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources ?? undefined,
        proposedActions: (m.proposedActions ?? undefined) as AiProposedAction[] | undefined,
      })))
      setShowSuggestions(false)
      const query = new URLSearchParams(searchParams.toString())
      query.set('session', session.id)
      router.replace(`/${params.orgSlug}/copilot?${query.toString()}`)
    } finally {
      setLoadingSession(false)
    }
  }

  function startNewChat() {
    resetConversation()
    setShowSuggestions(true)
    router.replace(`/${params.orgSlug}/copilot`)
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
      <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50/70 lg:flex">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-3">
          <span className="text-sm font-semibold text-slate-700">Conversations</span>
          <button
            type="button"
            onClick={startNewChat}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900"
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-sm text-slate-500">No conversations yet.</p>
          ) : (
            <div className="space-y-0.5">
              {sessions.map(session => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => void openSession(session.id)}
                  className={cn(
                    'flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors',
                    session.id === activeSessionId
                      ? 'bg-white font-medium text-slate-900 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900',
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate">{session.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
            <Bot className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-slate-700">Copilot</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={collapseToAddon}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
            Collapse
          </button>
          <button
            type="button"
            onClick={startNewChat}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </button>
        </header>
        {loadingSession ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : hasConversation ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="mx-auto w-full max-w-3xl space-y-4">
                {messages.map(message => (
                  <div key={message.id} className="space-y-3">
                    <div className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
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
                      </div>
                    </div>

                    {!message.pending && message.proposedActions && message.proposedActions.length > 0 && (
                      <div className="ml-8 max-w-md space-y-2">
                        {message.proposedActions.map((action, i) => (
                          <ProposedActionCard
                            key={`${action.type}-${i}`}
                            action={action}
                            onConfirm={executeAction}
                            onReject={_a => { /* UI updates internally */ }}
                            onStatusChange={(status, edited) =>
                              persistActionStatus(message.id, message.proposedActions ?? [], i, status, edited)
                            }
                          />
                        ))}
                      </div>
                    )}
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
