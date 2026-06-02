'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { useShallow } from 'zustand/react/shallow'
import {
  Archive,
  ChevronLeft,
  Clock,
  Download,
  Edit3,
  FileText,
  Forward,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Paperclip,
  RefreshCcw,
  Reply,
  ReplyAll,
  Search,
  Send,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { mailApi } from '@serenity/api'
import type { MailAccount, MailAttachment, MailThread, MailThreadDetail } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

type MailLabel = 'inbox' | 'starred' | 'sent' | 'archive' | 'trash'
type ComposeMode = 'compose' | 'reply' | 'replyAll' | 'forward'
type ReadFilter = 'all' | 'unread' | 'read'

const labels: Array<{ id: MailLabel; label: string; icon: typeof Inbox }> = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
]

const readFilters: Array<{ id: ReadFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
]

function displaySender(thread: MailThread) {
  return thread.fromName || thread.fromEmail || 'Unknown sender'
}

function senderInitials(nameOrEmail?: string | null) {
  const value = nameOrEmail?.trim()
  if (!value) return '?'
  const namePart = value.includes('@') ? value.split('@')[0] : value
  const words = namePart.split(/[.\s_-]+/).filter(Boolean)
  return (words[0]?.[0] ?? '?').concat(words[1]?.[0] ?? '').toUpperCase()
}

function timeLabel(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function fullTimeLabel(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBytes(size?: number | null) {
  if (!size) return null
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function splitEmails(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

export default function EmailPage() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const { token } = useAuthStore(useShallow(state => ({ token: state.token })))
  const [accounts, setAccounts] = useState<MailAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [label, setLabel] = useState<MailLabel>('inbox')
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [query, setQuery] = useState('')
  const [threads, setThreads] = useState<MailThread[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [threadDetail, setThreadDetail] = useState<MailThreadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [composeMode, setComposeMode] = useState<ComposeMode | null>(null)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const selectedAccount = useMemo(
    () => accounts.find(account => account.id === selectedAccountId) ?? accounts[0] ?? null,
    [accounts, selectedAccountId],
  )
  const selectedThread = useMemo(
    () => threads.find(thread => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  )

  const loadAccounts = useCallback(async () => {
    if (!token) return
    const response = await mailApi.listAccounts(token)
    setAccounts(response.accounts)
    setSelectedAccountId(current => current || response.accounts[0]?.id || '')
  }, [token])

  const loadThreads = useCallback(async (cursor?: string | null) => {
    if (!token) return
    if (cursor) {
      setBusyAction('load-more')
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const response = await mailApi.listThreads(token, {
        accountId: selectedAccountId || undefined,
        label,
        q: query.trim() || undefined,
        read: readFilter === 'all' ? undefined : readFilter,
        cursor: cursor || undefined,
      })
      setThreads(current => cursor ? [...current, ...response.threads] : response.threads)
      setNextCursor(response.nextCursor)
      if (!cursor) {
        setSelectedThreadId(current => current ?? response.threads[0]?.id ?? null)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load mail')
    } finally {
      if (cursor) {
        setBusyAction(null)
      } else {
        setLoading(false)
      }
    }
  }, [label, query, readFilter, selectedAccountId, token])

  useEffect(() => {
    if (!token) return
    void (async () => {
      setLoading(true)
      try {
        await loadAccounts()
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load mail accounts')
        setLoading(false)
      }
    })()
  }, [loadAccounts, token])

  useEffect(() => {
    void loadThreads()
  }, [loadThreads])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !nextCursor || loading || busyAction === 'load-more') return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        void loadThreads(nextCursor)
      }
    }, { rootMargin: '240px' })

    observer.observe(target)
    return () => observer.disconnect()
  }, [busyAction, loadThreads, loading, nextCursor])

  useEffect(() => {
    if (!token || !selectedThreadId) {
      setThreadDetail(null)
      return
    }
    setThreadLoading(true)
    mailApi.getThread(token, selectedThreadId)
      .then(setThreadDetail)
      .catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Failed to load thread'))
      .finally(() => setThreadLoading(false))
  }, [selectedThreadId, token])

  async function handleConnect() {
    if (!token) return
    setBusyAction('connect')
    setError(null)
    try {
      const returnTo = `${window.location.origin}/${params.orgSlug}/mail`
      const response = await mailApi.connectGoogle(token, returnTo)
      window.location.href = response.url
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Failed to connect Gmail')
      setBusyAction(null)
    }
  }

  async function handleDisconnectAccount(accountId: string) {
    if (!token) return
    setBusyAction(`disconnect-${accountId}`)
    setError(null)
    try {
      await mailApi.disconnectAccount(token, accountId)
      setAccounts(current => {
        const next = current.filter(account => account.id !== accountId)
        setSelectedAccountId(selectedAccountId === accountId ? next[0]?.id ?? '' : selectedAccountId)
        return next
      })
      if (selectedAccountId === accountId) {
        setThreads([])
        setSelectedThreadId(null)
        setThreadDetail(null)
      }
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'Failed to disconnect mail account')
    } finally {
      setBusyAction(null)
    }
  }

  function setThreadUnread(threadId: string, unread: boolean) {
    setThreads(current => current.map(thread => (
      thread.id === threadId ? { ...thread, unread } : thread
    )))
    setThreadDetail(current => (
      current?.id === threadId ? { ...current, unread } : current
    ))
  }

  async function openThread(thread: MailThread) {
    setSelectedThreadId(thread.id)
    if (!token || !thread.unread) return

    setThreadUnread(thread.id, false)
    try {
      await mailApi.action(token, thread.id, 'read')
      setThreadUnread(thread.id, false)
    } catch (actionError) {
      setThreadUnread(thread.id, true)
      setError(actionError instanceof Error ? actionError.message : 'Failed to mark email as read')
    }
  }

  async function runThreadAction(action: 'read' | 'unread' | 'star' | 'unstar' | 'archive' | 'trash' | 'restore') {
    if (!token || !selectedThread) return
    setBusyAction(action)
    setError(null)
    try {
      await mailApi.action(token, selectedThread.id, action)
      setThreads(current => current.map(thread => {
        if (thread.id !== selectedThread.id) return thread
        return {
          ...thread,
          unread: action === 'unread' ? true : action === 'read' ? false : thread.unread,
          starred: action === 'star' ? true : action === 'unstar' ? false : thread.starred,
          archived: action === 'archive' ? true : thread.archived,
          trashed: action === 'trash' ? true : action === 'restore' ? false : thread.trashed,
        }
      }))
      if (action === 'archive' || action === 'trash' || action === 'restore') {
        setSelectedThreadId(null)
        await loadThreads()
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Mail action failed')
    } finally {
      setBusyAction(null)
    }
  }

  function openCompose(mode: ComposeMode) {
    setComposeMode(mode)
    if (mode === 'compose' || !threadDetail) {
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
      return
    }
    const latest = threadDetail.messages[threadDetail.messages.length - 1]
    if (mode === 'forward') {
      setComposeTo('')
      setComposeSubject(threadDetail.subject.startsWith('Fwd:') ? threadDetail.subject : `Fwd: ${threadDetail.subject}`)
      setComposeBody(`\n\n---------- Forwarded message ----------\n${latest?.bodyText ?? threadDetail.snippet ?? ''}`)
      return
    }
    setComposeTo(mode === 'replyAll'
      ? [latest?.fromEmail, ...(latest?.toEmails ?? [])].filter(Boolean).join(', ')
      : latest?.fromEmail ?? '')
    setComposeSubject(threadDetail.subject.startsWith('Re:') ? threadDetail.subject : `Re: ${threadDetail.subject}`)
    setComposeBody('')
  }

  async function sendCompose() {
    if (!token || !composeMode || !composeBody.trim()) return
    setBusyAction('send')
    setError(null)
    try {
      if (composeMode === 'reply' || composeMode === 'replyAll') {
        if (!selectedThreadId) return
        await mailApi.reply(token, selectedThreadId, {
          body: composeBody,
          replyAll: composeMode === 'replyAll',
        })
      } else if (composeMode === 'forward') {
        if (!selectedThreadId) return
        await mailApi.forward(token, selectedThreadId, {
          accountId: selectedAccount?.id,
          to: splitEmails(composeTo),
          subject: composeSubject,
          body: composeBody,
        })
      } else {
        await mailApi.send(token, {
          accountId: selectedAccount?.id,
          to: splitEmails(composeTo),
          subject: composeSubject,
          body: composeBody,
        })
      }
      setComposeMode(null)
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send email')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDownloadAttachment(attachment: MailAttachment) {
    if (!token) return
    setDownloadingAttachmentId(attachment.id)
    setError(null)
    try {
      const blob = await mailApi.downloadAttachment(token, attachment.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.filename || 'attachment'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Failed to download attachment')
    } finally {
      setDownloadingAttachmentId(null)
    }
  }

  if (!loading && accounts.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-white px-6 text-slate-900 [color-scheme:light]">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-normal text-slate-950">No email account connected</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Connect your Google account in Settings to start using Mail and Calendar sync in Serenity.
          </p>
          <Button
            onClick={() => router.push(`/${params.orgSlug}/settings?tab=email`)}
            className="mt-6 w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            Go to Settings → Email
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 bg-white text-slate-900 [color-scheme:light]">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-slate-50/70 p-3 md:block">
        <Button onClick={() => openCompose('compose')} className="mb-4 w-full justify-start">
          <Edit3 className="mr-2 h-4 w-4" />
          Compose
        </Button>
        <div className="space-y-1">
          {labels.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setLabel(item.id)
                setSelectedThreadId(null)
              }}
              className={cn(
                'flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-950',
                label === item.id && 'bg-white text-slate-950 shadow-sm',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-normal text-slate-400">Account</p>
          {accounts.map(account => (
            <div
              key={account.id}
              className={cn(
                'w-full rounded-md px-2 py-2 text-sm hover:bg-white',
                selectedAccount?.id === account.id && 'bg-white shadow-sm',
              )}
            >
              <div className="flex items-start gap-2">
                <button type="button" onClick={() => setSelectedAccountId(account.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-medium text-slate-800">{account.email}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDisconnectAccount(account.id)}
                  disabled={busyAction === `disconnect-${account.id}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                  title="Disconnect account"
                >
                  {busyAction === `disconnect-${account.id}`
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <X className="h-3.5 w-3.5" />}
                </button>
              </div>
              <span className={cn('block truncate text-xs text-slate-500', account.status === 'ERROR' && 'text-red-600')}>
                {account.status === 'NEEDS_REAUTH'
                  ? 'Needs Google connection'
                  : account.status === 'ERROR'
                    ? account.lastError ?? 'Sync error'
                    : account.lastSyncedAt ? `Synced ${timeLabel(account.lastSyncedAt)}` : 'Waiting for sync'}
              </span>
              {account.status === 'NEEDS_REAUTH' && (
                <button
                  type="button"
                  onClick={handleConnect}
                  className="mt-2 flex h-7 items-center rounded-md bg-blue-600 px-2 text-xs font-medium text-white hover:bg-blue-500"
                >
                  Connect Google
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      <section className={cn('flex min-w-0 flex-1 border-r border-slate-200 md:max-w-md lg:max-w-lg', selectedThreadId && 'hidden md:flex')}>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 px-4">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search mail"
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => loadThreads()}
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              title="Refresh view"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </header>
          <div className="flex h-11 shrink-0 items-center gap-1 border-b border-slate-200 px-4">
            {readFilters.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setReadFilter(item.id)
                  setSelectedThreadId(null)
                }}
                className={cn(
                  'h-7 rounded-md px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                  readFilter === item.id && 'bg-slate-900 text-white hover:bg-slate-900 hover:text-white',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          {error && <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {selectedAccount?.status === 'NEEDS_REAUTH' ? (
              <div className="m-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-950">Connect this Gmail account</p>
                <p className="mt-1 text-sm leading-6 text-blue-800">
                  {selectedAccount.email} is created in Serenity. Connect Google to start background sync and enable send/actions.
                </p>
                <Button onClick={handleConnect} disabled={busyAction === 'connect'} className="mt-3">
                  {busyAction === 'connect' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Connect Google
                </Button>
              </div>
            ) : loading ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading mail
              </div>
            ) : threads.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-500">No mail in this view</div>
            ) : (
              <>
                {threads.map(thread => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => void openThread(thread)}
                    className={cn(
                      'grid w-full grid-cols-[36px_minmax(0,1fr)_auto] gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50',
                      selectedThreadId === thread.id && 'bg-blue-50',
                      thread.unread && 'bg-white',
                    )}
                  >
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                      {senderInitials(displaySender(thread))}
                      {thread.unread && <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-600" />}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={cn('truncate text-sm text-slate-700', thread.unread && 'font-semibold text-slate-950')}>
                          {displaySender(thread)}
                        </span>
                        {thread.starred && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-600">
                        <span className={cn('text-slate-800', thread.unread && 'font-semibold text-slate-950')}>
                          {thread.subject || '(no subject)'}
                        </span>
                        {thread.snippet && <span className="text-slate-400"> - {thread.snippet}</span>}
                      </p>
                    </div>
                    <span className={cn('pt-1 text-xs text-slate-400', thread.unread && 'font-semibold text-blue-700')}>
                      {timeLabel(thread.lastMessageAt)}
                    </span>
                  </button>
                ))}
                {nextCursor && (
                  <div ref={loadMoreRef} className="flex h-14 items-center justify-center border-b border-slate-100 text-sm text-slate-500">
                    {busyAction === 'load-more' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading more
                      </>
                    ) : 'Scroll for more'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <main className={cn('min-w-0 flex-1', !selectedThreadId && 'hidden md:block')}>
        {!selectedThreadId ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Select a message to read</div>
        ) : threadLoading || !threadDetail ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening thread
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 px-4">
              <button
                type="button"
                onClick={() => setSelectedThreadId(null)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 md:hidden"
                title="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-950">{threadDetail.subject}</h1>
              <ThreadActionButton busy={busyAction === 'archive'} title="Archive" onClick={() => runThreadAction('archive')} icon={Archive} />
              <ThreadActionButton busy={busyAction === 'trash'} title="Move to trash" onClick={() => runThreadAction('trash')} icon={Trash2} />
              <ThreadActionButton
                busy={busyAction === 'read' || busyAction === 'unread'}
                title={threadDetail.unread ? 'Mark read' : 'Mark unread'}
                onClick={() => runThreadAction(threadDetail.unread ? 'read' : 'unread')}
                icon={threadDetail.unread ? MailOpen : Mail}
              />
              <ThreadActionButton
                busy={busyAction === 'star' || busyAction === 'unstar'}
                title={threadDetail.starred ? 'Unstar' : 'Star'}
                onClick={() => runThreadAction(threadDetail.starred ? 'unstar' : 'star')}
                icon={Star}
                active={threadDetail.starred}
              />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
              <div className="mx-auto max-w-3xl space-y-4">
                <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <h2 className="text-xl font-semibold leading-7 text-slate-950">{threadDetail.subject || '(no subject)'}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{threadDetail.messages.length} {threadDetail.messages.length === 1 ? 'message' : 'messages'}</span>
                    {threadDetail.lastMessageAt && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {fullTimeLabel(threadDetail.lastMessageAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {threadDetail.messages.map((message, index) => (
                  <article key={message.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                        message.direction === 'OUTBOUND'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-200 text-slate-700',
                      )}>
                        {senderInitials(message.fromName || message.fromEmail || selectedAccount?.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {message.fromName || message.fromEmail || selectedAccount?.email || 'Unknown sender'}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {message.direction === 'OUTBOUND' ? 'Sent by you' : message.fromEmail}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-slate-400">{fullTimeLabel(message.sentAt) || timeLabel(message.sentAt)}</span>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-slate-500">
                          <EmailMeta label="To" values={message.toEmails.length ? message.toEmails : selectedAccount?.email ? [selectedAccount.email] : []} />
                          {message.ccEmails.length > 0 && <EmailMeta label="Cc" values={message.ccEmails} />}
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-5">
                      {index > 0 && message.subject && message.subject !== threadDetail.subject && (
                        <p className="mb-4 text-sm font-semibold text-slate-900">{message.subject}</p>
                      )}
                      <MailMarkdownBody value={message.bodyText || message.snippet || 'No preview available'} />
                    </div>
                    {message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
                        {message.attachments.map(attachment => (
                          <MailAttachmentButton
                            key={attachment.id}
                            attachment={attachment}
                            busy={downloadingAttachmentId === attachment.id}
                            onClick={() => handleDownloadAttachment(attachment)}
                          />
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
            <footer className="flex shrink-0 items-center gap-2 border-t border-slate-200 px-4 py-3">
              <Button variant="secondary" onClick={() => openCompose('reply')}>
                <Reply className="mr-2 h-4 w-4" />
                Reply
              </Button>
              <Button variant="secondary" onClick={() => openCompose('replyAll')}>
                <ReplyAll className="mr-2 h-4 w-4" />
                Reply all
              </Button>
              <Button variant="secondary" onClick={() => openCompose('forward')}>
                <Forward className="mr-2 h-4 w-4" />
                Forward
              </Button>
            </footer>
          </div>
        )}
      </main>

      {composeMode && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(520px,calc(100vw-32px))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
          <div className="flex h-11 items-center justify-between border-b border-slate-200 px-4">
            <p className="text-sm font-semibold text-slate-950">{composeMode === 'compose' ? 'New message' : composeSubject}</p>
            <button type="button" onClick={() => setComposeMode(null)} className="text-slate-400 hover:text-slate-900" title="Close composer">
              <X className="h-4 w-4" />
            </button>
          </div>
          {(composeMode === 'compose' || composeMode === 'forward') && (
            <>
              <input value={composeTo} onChange={event => setComposeTo(event.target.value)} placeholder="To" className="h-10 w-full border-b border-slate-100 px-4 text-sm outline-none" />
              <input value={composeSubject} onChange={event => setComposeSubject(event.target.value)} placeholder="Subject" className="h-10 w-full border-b border-slate-100 px-4 text-sm outline-none" />
            </>
          )}
          <textarea
            value={composeBody}
            onChange={event => setComposeBody(event.target.value)}
            placeholder="Write your message"
            className="h-56 w-full resize-none px-4 py-3 text-sm leading-6 outline-none"
          />
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <button type="button" onClick={() => setComposeMode(null)} className="text-sm text-slate-500 hover:text-slate-900">Discard</button>
            <Button onClick={sendCompose} disabled={busyAction === 'send' || !composeBody.trim()}>
              {busyAction === 'send' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function EmailMeta({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null
  return (
    <div className="flex min-w-0 gap-2">
      <span className="w-6 shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 truncate">{values.join(', ')}</span>
    </div>
  )
}

function MailMarkdownBody({ value }: { value: string }) {
  return (
    <div className="break-words text-[15px] leading-7 text-slate-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-blue-900"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-slate-200 pl-4 text-slate-600">{children}</blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px] text-slate-900">{children}</code>
          ),
          h1: ({ children }) => <h1 className="mb-3 mt-5 text-xl font-semibold leading-7 text-slate-950">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-5 text-lg font-semibold leading-7 text-slate-950">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold leading-6 text-slate-950">{children}</h3>,
          li: ({ children }) => <li className="ml-5 list-disc pl-1">{children}</li>,
          ol: ({ children }) => <ol className="my-3 space-y-1">{children}</ol>,
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-md bg-slate-950 px-3 py-2 text-sm leading-6 text-slate-50">{children}</pre>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="min-w-full border-collapse border border-slate-200 text-sm">{children}</table>
            </div>
          ),
          td: ({ children }) => <td className="border border-slate-200 px-3 py-2 align-top">{children}</td>,
          th: ({ children }) => <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold">{children}</th>,
          ul: ({ children }) => <ul className="my-3 space-y-1">{children}</ul>,
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  )
}

function MailAttachmentButton({
  attachment,
  busy,
  onClick,
}: {
  attachment: MailAttachment
  busy: boolean
  onClick: () => void
}) {
  const size = formatBytes(attachment.size)
  const mime = attachment.mimeType?.split('/')[1]?.toUpperCase()

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex min-h-12 max-w-full items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 disabled:opacity-70"
      title={attachment.filename}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block max-w-64 truncate font-medium text-slate-900">{attachment.filename || 'Attachment'}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <Paperclip className="h-3 w-3" />
          {size ?? mime ?? 'File'}
        </span>
      </span>
      <Download className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
  )
}

function ThreadActionButton({
  active,
  busy,
  icon: Icon,
  onClick,
  title,
}: {
  active?: boolean
  busy: boolean
  icon: typeof Archive
  onClick: () => void
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950 disabled:opacity-60',
        active && 'text-amber-500',
      )}
      title={title}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className={cn('h-4 w-4', active && 'fill-amber-400')} />}
    </button>
  )
}
