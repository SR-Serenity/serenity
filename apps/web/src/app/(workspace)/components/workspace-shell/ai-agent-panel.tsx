'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { aiApi, calendarApi, wikiApi } from '@serenity/api'
import type { AiChatMessage, AiProposedAction, AiSource } from '@serenity/api'
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
import { useAiAgentStore } from '@/stores/ai-agent-store'
import { useAiContext } from '@/hooks/use-ai-context'
import { ProposedActionCard } from './proposed-action-card'

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
  pending?: boolean
  sources?: AiSource[]
  proposedActions?: AiProposedAction[]
}

function AssistantContent({ content, pending }: { content: string; pending?: boolean }) {
  if (pending) {
    return (
      <span className="flex items-center gap-1 text-slate-400">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
      </span>
    )
  }
  return (
    <div className="prose prose-sm prose-slate max-w-none [&_p:last-child]:mb-0 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:my-1 [&_ol]:my-1">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</ReactMarkdown>
    </div>
  )
}

function buildHistory(messages: ChatEntry[], userContent: string): AiChatMessage[] {
  return [
    ...messages
      .filter(message => !message.pending)
      .map(message => ({
        role: message.role,
        content: message.content,
      }) satisfies AiChatMessage),
    { role: 'user', content: userContent },
  ]
}

export function AiAgentPanelContent({
  compact = false,
}: {
  basePath?: string
  compact?: boolean
}) {
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const currentOrg = useAuthStore(state => state.currentOrg)
  const { contextLabel, requestContext } = useAiContext()
  const sessionId = useMemo(() => `web-ai-${crypto.randomUUID()}`, [])
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [sending, setSending] = useState(false)

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

  const hasConversation = messages.length > 0

  function supersedePending(msgs: ChatEntry[], keepMessageId: string): ChatEntry[] {
    return msgs.map(message => {
      if (message.id === keepMessageId || !message.proposedActions) return message
      const hasActive = message.proposedActions.some(
        action => action.status !== 'confirmed' && action.status !== 'rejected' && action.status !== 'superseded',
      )
      if (!hasActive) return message
      return {
        ...message,
        proposedActions: message.proposedActions.map(action =>
          action.status !== 'confirmed' && action.status !== 'rejected'
            ? { ...action, status: 'superseded' as const }
            : action,
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
    const updated = actions.map((action, actionIndex) => (
      actionIndex === index ? { ...editedAction, status } : action
    ))
    setMessages(current => current.map(message => (
      message.id === messageId ? { ...message, proposedActions: updated } : message
    )))
  }

  function startNewConversation() {
    setMessages([])
    setPrompt('')
    setShowSuggestions(true)
  }

  async function sendPrompt(value: string) {
    const content = value.trim()
    if (!content || sending) return

    const authReady = token && user && currentOrg
    const userMessage: ChatEntry = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    }
    const pendingId = `assistant-${Date.now()}`

    setMessages(current => [
      ...current,
      userMessage,
      {
        id: pendingId,
        role: 'assistant',
        content: authReady ? 'Thinking...' : 'Sign in to use Serenity AI.',
        pending: Boolean(authReady),
      },
    ])
    setPrompt('')
    setShowSuggestions(false)

    if (!authReady) return

    setSending(true)
    try {
      const response = await aiApi.chat(token, {
        sessionId,
        messages: buildHistory(messages, content),
        authContext: {
          orgId: currentOrg.id,
          userId: user.id,
          role: currentOrg.role,
        },
        context: {
          entrypoint: compact ? 'mini_panel' : 'workspace_panel',
          ...requestContext,
        },
      })

      setMessages(current => {
        const withResponse = current.map(message =>
          message.id === pendingId
            ? {
                ...message,
                content: response.answer,
                pending: false,
                sources: response.sources,
                proposedActions: response.proposedActions,
              }
            : message,
        )
        return response.proposedActions?.length
          ? supersedePending(withResponse, pendingId)
          : supersedePending(withResponse, '')
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Serenity AI is unavailable.'
      setMessages(current =>
        current.map(entry =>
          entry.id === pendingId
            ? {
                ...entry,
                content: message,
                pending: false,
              }
            : entry,
        ),
      )
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendPrompt(prompt)
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
    <div className="flex h-full min-h-0 flex-col text-slate-900 [color-scheme:light]">
      <div className="flex shrink-0 items-center justify-between pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#2f6fed] shadow-sm ring-1 ring-blue-100">
            <Bot className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#20345f]">Serenity AI</p>
            {contextLabel ? (
              <p className="truncate text-xs text-blue-600" title={contextLabel}>Context: {contextLabel}</p>
            ) : (
              <p className="text-xs text-[#7c8bad]">Automatic</p>
            )}
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
                <div key={message.id} className="space-y-2">
                  <div className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-5',
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-700 shadow-sm ring-1 ring-blue-100',
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <AssistantContent content={message.content} pending={message.pending} />
                      ) : (
                        <span className="whitespace-pre-wrap">{message.content}</span>
                      )}
                      {!message.pending && message.sources && message.sources.length > 0 && (
                        <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                          {message.sources.length} source{message.sources.length === 1 ? '' : 's'}
                        </div>
                      )}
                    </div>
                  </div>
                  {!message.pending && message.proposedActions && message.proposedActions.length > 0 && (
                    <div className="space-y-2">
                      {message.proposedActions.map((action, index) => (
                        <ProposedActionCard
                          key={`${action.type}-${index}`}
                          action={action}
                          onConfirm={executeAction}
                          onReject={() => { /* no-op; UI updates internally */ }}
                          onStatusChange={(status, edited) =>
                            persistActionStatus(message.id, message.proposedActions ?? [], index, status, edited)
                          }
                        />
                      ))}
                    </div>
                  )}
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
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const currentOrg = useAuthStore(state => state.currentOrg)
  const { contextLabel, requestContext } = useAiContext()
  const {
    sessions,
    activeSessionId,
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

  function supersedePending(msgs: ChatEntry[], keepMessageId: string): ChatEntry[] {
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
      void aiApi.updateMessage(token, activeSessionId, messageId, { proposedActions: updated }).catch(() => { /* best-effort */ })
    }
  }

  type View = 'history' | 'chat'
  const [view, setView] = useState<View>(messages.length > 0 || activeSessionId ? 'chat' : 'history')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) return
    void aiApi.listSessions(token).then(res => setSessions(res.sessions)).catch(() => { /* empty */ })
  }, [token])

  useEffect(() => {
    if (activeSessionId || messages.length > 0) {
      setView('chat')
    }
  }, [activeSessionId, messages.length])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  async function openSession(sessionId: string) {
    if (!token) return
    setLoadingSession(true)
    try {
      const session = await aiApi.getSession(token, sessionId)
      setActiveSessionId(session.id)
      setMessages(
        session.messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources ?? undefined,
          proposedActions: m.proposedActions as AiProposedAction[] | undefined,
        })),
      )
      setView('chat')
    } finally {
      setLoadingSession(false)
    }
  }

  function startNewChat() {
    resetConversation()
    setView('chat')
  }

  async function sendPrompt(value: string) {
    const content = value.trim()
    if (!content || sending || !token || !user || !currentOrg) return

    const pendingId = `mini-assistant-${Date.now()}`
    setMessages(prev => [
      ...prev,
      { id: `mini-user-${Date.now()}`, role: 'user', content },
      { id: pendingId, role: 'assistant', content: '', pending: true },
    ])
    setPrompt('')
    setSending(true)

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
      } catch {
        setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, content: 'Failed to create session.', pending: false } : m))
        setSending(false)
        return
      }
    }

    void aiApi.appendMessages(token, sessionId, [{ role: 'user', content }]).catch(() => { /* empty */ })

    try {
      const history = messages.filter(m => !m.pending).map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content })

      const response = await aiApi.chat(token, {
        sessionId,
        messages: history,
        authContext: { orgId: currentOrg.id, userId: user.id, role: currentOrg.role },
        context: { entrypoint: 'mini_panel', ...requestContext },
      })

      setMessages(prev => {
        const withResponse = prev.map(m =>
          m.id === pendingId
            ? { ...m, content: response.answer, pending: false, sources: response.sources, proposedActions: response.proposedActions }
            : m,
        )
        return response.proposedActions?.length
          ? supersedePending(withResponse, pendingId)
          : supersedePending(withResponse, '')
      })

      void aiApi.appendMessages(token, sessionId, [
        { role: 'assistant', content: response.answer, sources: response.sources, proposedActions: response.proposedActions },
      ])
        .then(() => aiApi.listSessions(token).then(res => setSessions(res.sessions)))
        .catch(() => { /* empty */ })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Serenity AI is unavailable.'
      setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, content: msg, pending: false } : m))
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendPrompt(prompt)
  }

  // ── History view ────────────────────────────────────────────────────────────
  if (view === 'history') {
    return (
      <div className="flex h-full min-h-0 flex-col text-slate-900 [color-scheme:light]">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Conversations</p>
          <button
            type="button"
            onClick={startNewChat}
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-xs text-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Serenity AI</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    Start a conversation and your history will appear here.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {sessions.map(session => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => void openSession(session.id)}
                  className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate">{session.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 shrink-0">
          <button
            type="button"
            onClick={startNewChat}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Start new chat
          </button>
        </div>
      </div>
    )
  }

  // ── Chat view ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col text-slate-900 [color-scheme:light]">
      <div className="mb-3 flex shrink-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView('history')}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            title="Back to history"
          >
            <CheckCircle2 className="hidden" />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
            {activeSessionId ? (sessions.find(s => s.id === activeSessionId)?.title ?? 'Chat') : 'New chat'}
          </p>
        <button
          type="button"
          onClick={startNewChat}
          className="flex h-7 items-center gap-1 rounded-lg px-2 text-xs text-blue-600 hover:bg-blue-50"
          title="New chat"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        </div>
        {contextLabel && (
          <p className="truncate text-xs text-blue-600 pl-9" title={contextLabel}>Context: {contextLabel}</p>
        )}
      </div>

      {loadingSession ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {messages.length > 0 ? (
            <div className="space-y-3 pb-2">
              {messages.map(message => (
                <div key={message.id} className="space-y-2">
                  <div className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-5',
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-700 shadow-sm ring-1 ring-blue-100',
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <AssistantContent content={message.content} pending={message.pending} />
                      ) : (
                        <span className="whitespace-pre-wrap">{message.content}</span>
                      )}
                    </div>
                  </div>
                  {!message.pending && message.proposedActions && message.proposedActions.length > 0 && (
                    <div className="space-y-2">
                      {message.proposedActions.map((action, index) => (
                        <ProposedActionCard
                          key={`${action.type}-${index}`}
                          action={action}
                          onConfirm={executeAction}
                          onReject={() => { /* UI updates internally */ }}
                          onStatusChange={(status, edited) =>
                            persistActionStatus(message.id, message.proposedActions ?? [], index, status, edited)
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Serenity AI</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    Ask anything about your workspace.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-3 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-blue-400"
      >
        <textarea
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void sendPrompt(prompt)
            }
          }}
          placeholder="Ask Serenity AI..."
          className="h-20 w-full resize-none bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
          <div className="flex items-center gap-1">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50" title="Attach file">
              <Paperclip className="h-4 w-4" />
            </button>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50" title="Voice input">
              <Mic className="h-4 w-4" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!prompt.trim() || sending}
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
