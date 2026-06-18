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
  lightSurface = false,
  onOpenSession,
  onDeleteSession,
}: {
  sessions: ChatSession[]
  activeSessionId: string | null
  compact: boolean
  lightSurface?: boolean
  onOpenSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string, event?: MouseEvent) => void
}) {
  return (
    <div className="space-y-0.5">
      {sessions.map(session => (
        <div
          key={session.id}
          className={cn(
            'group flex min-w-0 items-center gap-1 rounded-lg px-1 transition-all duration-150',
            lightSurface ? 'hover:bg-gray-100/60' : 'hover:bg-popup-hover',
          )}
        >
          <button
            type="button"
            onClick={() => void onOpenSession(session.id)}
            className={cn(
              'flex cursor-pointer min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-all duration-150',
              compact ? 'text-xs sm:text-sm' : 'text-sm',
              session.id === activeSessionId
                ? lightSurface
                  ? 'bg-white font-medium text-gray-900 shadow-sm ring-1 ring-gray-200'
                  : 'bg-popup-hover font-medium text-foreground'
                : lightSurface
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
            <span className="min-w-0 flex-1 truncate">{session.title}</span>
          </button>
          <button
            type="button"
            onClick={e => onDeleteSession(session.id, e)}
            className="flex cursor-pointer h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
            title="Delete conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
