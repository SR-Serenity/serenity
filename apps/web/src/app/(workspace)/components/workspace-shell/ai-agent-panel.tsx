'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { aiApi, calendarApi, tasksApi, wikiApi } from '@serenity/api'
import type { AiProposedAction, AiSessionMessage } from '@serenity/api'
import {
  Bot,
  CheckCircle2,
  MessageSquare,
  PanelRightClose,
  Plus,
} from 'lucide-react'
import type { AiSource } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { useAiAgentStore } from '@/stores/ai-agent-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useAiContext } from '@/hooks/use-ai-context'
import { useCopilotContextStore } from '@/stores/copilot-context-store'
import { browserTimezone, unixToIso } from '@/lib/time'
import { ChatComposer } from './chat-composer'
import { ChatMessageList } from './chat-message-list'
import { ChatSessionList, type ChatSession } from './chat-session-list'
import { DeleteConversationDialog } from './delete-conversation-dialog'

const suggestions = [
  { label: "What's new in my workspace?", icon: Bot },
  { label: 'Write meeting agenda', icon: MessageSquare },
  { label: 'Create a task tracker', icon: CheckCircle2 },
]

export type ChatEntry = {
  id: string
  role: 'user' | 'assistant'
  content: string
  pending?: boolean
  sources?: import('@serenity/api').AiSource[]
  proposedActions?: import('@serenity/api').AiProposedAction[]
}

export function AiChatPanel({ compact = false }: { compact?: boolean }) {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  const currentOrg = useAuthStore(s => s.currentOrg)
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

  const [view, setView] = useState<'history' | 'chat'>('chat')
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const sessionParam = compact ? null : searchParams?.get('session')
  const fromParam = compact ? null : searchParams?.get('from')

  // Persist and restore AI panel state
  const storageKey = `ai-panel-state-${compact ? 'compact' : 'full'}`
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const state = JSON.parse(saved)
        if (state.activeSessionId && !activeSessionId) {
          setActiveSessionId(state.activeSessionId)
        }
        if (state.view && compact) {
          setView(state.view)
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [compact])

  // Save state whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const state = { activeSessionId, view: compact ? view : 'chat' }
    localStorage.setItem(storageKey, JSON.stringify(state))
  }, [activeSessionId, view, compact, storageKey])

  useEffect(() => {
    if (!token) return
    void aiApi.listSessions(token).then(res => setSessions(res.sessions)).catch(() => undefined)
  }, [token, setSessions])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load conversation when activeSessionId is restored from localStorage
  useEffect(() => {
    if (!token || !activeSessionId || messages.length > 0) return

    setLoadingSession(true)
    aiApi.getSession(token, activeSessionId)
      .then(session => {
        const loaded: ChatEntry[] = session.messages.map((m: AiSessionMessage) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources ?? undefined,
          proposedActions: (m.proposedActions ?? undefined) as AiProposedAction[] | undefined,
        }))
        let lastActiveId = ''
        for (let i = loaded.length - 1; i >= 0; i--) {
          if (loaded[i].proposedActions?.some(
            a => a.status !== 'confirmed' && a.status !== 'rejected' && a.status !== 'superseded',
          )) {
            lastActiveId = loaded[i].id
            break
          }
        }
        setMessages(lastActiveId ? supersedePending(loaded, lastActiveId) : loaded)
        setShowSuggestions(false)
      })
      .catch(() => { /* best-effort */ })
      .finally(() => setLoadingSession(false))
  }, [token, activeSessionId, messages.length])

  // Keep compact view in sync with store state
  useEffect(() => {
    if (compact && (activeSessionId || messages.length > 0)) {
      setView('chat')
    }
  }, [compact, activeSessionId, messages.length])

  // Load session from URL param (full mode only)
  useEffect(() => {
    if (compact || !token) {
      if (!token) {
        resetConversation()
        setShowSuggestions(true)
      }
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
        const loaded: ChatEntry[] = session.messages.map((m: AiSessionMessage) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources ?? undefined,
          proposedActions: (m.proposedActions ?? undefined) as AiProposedAction[] | undefined,
        }))
        let lastActiveId = ''
        for (let i = loaded.length - 1; i >= 0; i--) {
          if (loaded[i].proposedActions?.some(
            a => a.status !== 'confirmed' && a.status !== 'rejected' && a.status !== 'superseded',
          )) {
            lastActiveId = loaded[i].id
            break
          }
        }
        setMessages(lastActiveId ? supersedePending(loaded, lastActiveId) : loaded)
        setShowSuggestions(false)
      })
      .catch(() => router.replace(window.location.pathname))
      .finally(() => setLoadingSession(false))
  }, [compact, sessionParam, token, activeSessionId])

  function supersedePending(msgs: ChatEntry[], keepMessageId: string): ChatEntry[] {
    return msgs.map(m => {
      if (m.id === keepMessageId || !m.proposedActions) return m
      // Mark all old proposed actions as superseded except confirmed ones
      return {
        ...m,
        proposedActions: m.proposedActions.map(a =>
          a.status === 'confirmed' ? a : { ...a, status: 'superseded' as const }
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
    const updated = actions.map((a, i) => {
      if (i === index) {
        // Merge edited payload and set the confirmed/rejected status
        return { ...editedAction, status, payload: editedAction.payload }
      }
      return a
    })
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, proposedActions: updated } : m))
    if (activeSessionId && token) {
      void aiApi.updateMessage(token, activeSessionId, messageId, { proposedActions: updated }).catch(() => undefined)
    }
  }

  async function executeAction(action: AiProposedAction): Promise<void> {
    if (!token || !currentOrg) throw new Error('Not authenticated')
    const p = action.payload as Record<string, unknown>
    if (action.type === 'UPDATE_CALENDAR_ITEM') {
      const itemId = String(p.itemId ?? '')
      if (!itemId) throw new Error('No calendar item ID')
      await calendarApi.updateItem(token, itemId, {
        type: (p.itemType as 'EVENT' | 'MEETING' | 'TASK' | undefined) ?? undefined,
        visibility: (p.visibility as 'COMPANY' | 'PERSONAL' | undefined) ?? undefined,
        title: p.title as string | undefined,
        descriptionMarkdown: (p.descriptionMarkdown as string | undefined)
          ?? (p.description as string | undefined),
        location: p.location as string | undefined,
        startAt: unixToIso(p.startAt as number | null | undefined),
        endAt: unixToIso(p.endAt as number | null | undefined),
        dueDate: p.dueDate as string | undefined,
        attendeeIds: (p.attendeeIds as string[] | undefined) ?? undefined,
        roomId: p.roomId as string | undefined,
        wikiPageId: p.wikiPageId as string | undefined,
        allDay: p.allDay as boolean | undefined,
        taskStatus: p.taskStatus as 'TODO' | 'DONE' | undefined,
      })
    } else if (action.type === 'CREATE_MEETING' || action.type === 'BOOK_ROOM') {
      await calendarApi.createItem(token, {
        type: 'MEETING',
        visibility: (p.visibility as 'COMPANY' | 'PERSONAL') ?? 'COMPANY',
        title: String(p.title ?? 'New meeting'),
        startAt: unixToIso(p.startAt as number | null | undefined),
        endAt: unixToIso(p.endAt as number | null | undefined),
        location: p.location as string | undefined,
        attendeeIds: (p.attendeeIds as string[]) ?? [],
        roomId: p.roomId as string | undefined,
      })
    } else if (action.type === 'CREATE_TASK') {
      await tasksApi.createTask(token, {
        title: String(p.title ?? 'New task'),
        description: (p.description as string | undefined) ?? null,
        assigneeId: (p.assigneeId as string | undefined) ?? null,
        dueDate: (p.dueDate as string | undefined) ?? null,
        sourceType: 'AI',
        createdByAi: true,
        aiReason:
          (p.reason as string | undefined) ?? (p.aiReason as string | undefined) ?? null,
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
      // If the target page is currently open in the editor, apply the change live with preview
      const insertAction = useCopilotContextStore.getState().insertAction
      if (
        insertAction?.type === 'wiki' &&
        insertAction.pageId === pageId &&
        p.contentMarkdown
      ) {
        await insertAction.execute(p.contentMarkdown as string)
      } else {
        await wikiApi.updatePage(token, pageId, {
          title: p.title as string | undefined,
          contentMarkdown: p.contentMarkdown as string | undefined,
        })
      }
    }
  }

  async function sendPrompt(value: string) {
    const content = value.trim()
    if (!content || sending || !token || !user || !currentOrg) return

    const pendingId = `assistant-${Date.now()}`
    setMessages(prev => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content },
      { id: pendingId, role: 'assistant', content: '', pending: true },
    ])
    setPrompt('')
    setShowSuggestions(false)
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
        if (!compact) {
          const query = new URLSearchParams(searchParams?.toString() ?? '')
          query.set('session', session.id)
          router.replace(`/${params.orgSlug}/copilot?${query.toString()}`)
        }
      } catch {
        setMessages(prev => prev.map(m =>
          m.id === pendingId ? { ...m, content: 'Failed to create session.', pending: false } : m,
        ))
        setSending(false)
        return
      }
    }

    void aiApi.appendMessages(token, sessionId, [{ role: 'user', content }]).catch(() => undefined)

    try {
      const response = await aiApi.streamChat(token, {
        sessionId,
        message: content,
        authContext: {
          orgId: currentOrg.id,
          userId: user.id,
          role: currentOrg.role,
          displayName: user.displayName,
          email: user.email,
          orgName: currentOrg.name,
          orgSlug: currentOrg.slug,
        },
        context: {
          entrypoint: compact ? 'mini_panel' : 'workspace_panel',
          timeZone: browserTimezone(),
          ...requestContext,
        },
      }, {
        onToken: chunk => {
          setMessages(prev => prev.map(m =>
            m.id === pendingId ? { ...m, content: `${m.content}${chunk}` } : m,
          ))
        },
        onAnswer: answer => {
          setMessages(prev => prev.map(m =>
            m.id === pendingId ? { ...m, content: answer } : m,
          ))
        },
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
        .then(res => {
          const serverMessage = res.messages?.[0]
          if (serverMessage?.id) {
            setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, id: serverMessage.id } : m))
          }
          return aiApi.listSessions(token).then(r => setSessions(r.sessions))
        })
        .catch(() => undefined)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Serenity AI is unavailable.'
      setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, content: msg, pending: false } : m))
    } finally {
      setSending(false)
    }
  }

  async function openSession(sessionId: string) {
    if (!token || sessionId === activeSessionId) return
    setLoadingSession(true)
    try {
      const session = await aiApi.getSession(token, sessionId)
      setActiveSessionId(session.id)
      setMessages(session.messages.map((m: AiSessionMessage) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources ?? undefined,
        proposedActions: (m.proposedActions ?? undefined) as AiProposedAction[] | undefined,
      })))
      setShowSuggestions(false)
      if (!compact) {
        const query = new URLSearchParams(searchParams?.toString() ?? '')
        query.set('session', session.id)
        router.replace(`/${params.orgSlug}/copilot?${query.toString()}`)
      } else {
        setView('chat')
      }
    } finally {
      setLoadingSession(false)
    }
  }

  function startNewChat() {
    resetConversation()
    setDeleteDialogOpen(false)
    setSessionToDelete(null)
    if (compact) {
      setView('chat')
    } else {
      setShowSuggestions(true)
      router.replace(`/${params.orgSlug}/copilot`)
    }
  }

  function openDeleteDialog(sessionId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setSessionToDelete(sessionId)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!token || !sessionToDelete) return
    try {
      await aiApi.deleteSession(token, sessionToDelete)
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete))
      if (activeSessionId === sessionToDelete) {
        resetConversation()
        if (compact) {
          setView('history')
        } else {
          router.replace(`/${params.orgSlug}/copilot`)
        }
      }
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
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

  function handleOpenSource(source: AiSource) {
    if (!source.url) return
    // If it's a relative wiki path, use router.push for SPA navigation
    if (source.url.startsWith('/')) {
      router.push(source.url)
    } else {
      window.open(source.url, '_blank', 'noopener,noreferrer')
    }
  }

  // ── Compact mode (sidebar panel) ───────────────────────────────────────────
  if (compact) {
    if (view === 'history') {
      return (
        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Chats</p>
            <button
              type="button"
              onClick={startNewChat}
              className="flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400">No conversations yet.</p>
                <button
                  type="button"
                  onClick={startNewChat}
                  className="mt-3 text-sm font-medium text-gray-700 underline-offset-2 hover:underline"
                >
                  Start your first chat
                </button>
              </div>
            ) : (
              <ChatSessionList
                sessions={sessions as ChatSession[]}
                activeSessionId={activeSessionId}
                compact
                onOpenSession={openSession}
                onDeleteSession={openDeleteDialog}
              />
            )}
          </div>

          <DeleteConversationDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={confirmDelete}
          />
        </div>
      )
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-3 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setView('history')}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="All chats"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
            {activeSessionId ? (sessions.find(s => s.id === activeSessionId)?.title ?? 'Chat') : 'New chat'}
          </p>
          <button
            type="button"
            onClick={startNewChat}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {contextLabel && (
          <p className="mb-2 truncate text-xs text-gray-400" title={contextLabel}>
            Context: {contextLabel}
          </p>
        )}

        {loadingSession ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {messages.length > 0 ? (
              <ChatMessageList
                messages={messages}
                compact
                bottomRef={bottomRef}
                onConfirmAction={executeAction}
                onRejectAction={() => undefined}
                onStatusChange={persistActionStatus}
                onOpenSource={handleOpenSource}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                  <Bot className="h-5 w-5" />
                </div>
                <p className="text-sm text-gray-400">Ask Copilot anything about your workspace.</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 shrink-0">
          <ChatComposer
            compact
            prompt={prompt}
            sending={sending}
            onPromptChange={setPrompt}
            onSubmit={sendPrompt}
          />
        </div>

        <DeleteConversationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
        />
      </div>
    )
  }

  // ── Full page mode (copilot page) ──────────────────────────────────────────
  return (
    <div className="relative flex h-full min-h-0 bg-white text-slate-900 scheme-light">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50/70 lg:flex">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-3">
          <span className="text-sm font-semibold text-slate-700">Conversations</span>
          <button
            type="button"
            onClick={startNewChat}
            className="flex cursor-pointer h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900"
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-sm text-slate-500">No conversations yet.</p>
          ) : (
            <ChatSessionList
              sessions={sessions as ChatSession[]}
              activeSessionId={activeSessionId}
              compact={false}
              onOpenSession={openSession}
              onDeleteSession={openDeleteDialog}
            />
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
            <Bot className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-slate-700">Copilot</span>
          {contextLabel && (
            <span className="text-xs text-gray-400">· {contextLabel}</span>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={collapseToAddon}
            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
            Collapse
          </button>
          <button
            type="button"
            onClick={startNewChat}
            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </button>
        </header>

        {loadingSession ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
          </div>
        ) : messages.length > 0 ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="mx-auto w-full max-w-3xl">
                <ChatMessageList
                  messages={messages}
                  compact={false}
                  bottomRef={bottomRef}
                  onConfirmAction={executeAction}
                  onRejectAction={() => undefined}
                  onStatusChange={persistActionStatus}
                  onOpenSource={handleOpenSource}
                />
              </div>
            </div>
            <div className="shrink-0 px-5 pb-4">
              <div className="mx-auto w-full max-w-3xl">
                <ChatComposer
                  compact={false}
                  prompt={prompt}
                  sending={sending}
                  onPromptChange={setPrompt}
                  onSubmit={sendPrompt}
                />
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
              <h2 className="text-center text-2xl font-semibold text-gray-900">
                How can I help you?
              </h2>
              <div className="mt-7">
                <ChatComposer
                  compact={false}
                  prompt={prompt}
                  sending={sending}
                  onPromptChange={setPrompt}
                  onSubmit={sendPrompt}
                />
              </div>
              {showSuggestions && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {suggestions.map(suggestion => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => setPrompt(suggestion.label)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
                    >
                      <suggestion.icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <DeleteConversationDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} />
    </div>
  )
}
