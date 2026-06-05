'use client'

import type { MouseEvent } from 'react'
import { MessageSquare, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ChatSession = {
  id: string
  title: string
}

export function ChatSessionList({
  sessions,
  activeSessionId,
  compact,
  onOpenSession,
  onDeleteSession,
}: {
  sessions: ChatSession[]
  activeSessionId: string | null
  compact: boolean
  onOpenSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string, event?: MouseEvent) => void
}) {
  return (
    <div className="space-y-1">
      {sessions.map(session => (
        <div
          key={session.id}
          className="group flex min-w-0 items-center gap-1 rounded-lg px-1 transition-colors hover:bg-white/50"
        >
          <button
            type="button"
            onClick={() => void onOpenSession(session.id)}
            className={cn(
              'flex cursor-pointer min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left transition-colors',
              compact ? 'text-xs sm:text-sm' : 'text-sm',
              session.id === activeSessionId
                ? 'bg-white font-medium text-slate-900 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate">{session.title}</span>
          </button>
          <button
            type="button"
            onClick={e => onDeleteSession(session.id, e)}
            className="flex cursor-pointer h-7 w-7 shrink-0 items-center justify-center rounded text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
            title="Delete conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
