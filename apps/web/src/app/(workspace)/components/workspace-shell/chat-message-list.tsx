'use client'

import type { RefObject } from 'react'
import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AiProposedAction, AiSource } from '@serenity/api'
import { ProposedActionCard } from './proposed-action-card'
import { AssistantContent } from './assistant-content'
import { SourceList } from './source-list'
import type { ChatEntry } from './ai-agent-panel'

export function ChatMessageList({
  messages,
  compact,
  bottomRef,
  onConfirmAction,
  onRejectAction,
  onStatusChange,
  onOpenSource,
}: {
  messages: ChatEntry[]
  compact: boolean
  bottomRef: RefObject<HTMLDivElement | null>
  onConfirmAction: (action: AiProposedAction) => Promise<void>
  onRejectAction: () => void
  onStatusChange: (
    messageId: string,
    actions: AiProposedAction[],
    index: number,
    status: 'confirmed' | 'rejected',
    editedAction: AiProposedAction,
  ) => void
  /** Called when user clicks a source pill to navigate to the document */
  onOpenSource?: (source: AiSource) => void
}) {
  return (
    <div className={cn('space-y-3', !compact && 'pb-2')}>
      {messages.map(message => (
        <div key={message.id} className="space-y-2">
          <div className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
            {!compact && message.role === 'assistant' && (
              <span className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <Bot className="h-3.5 w-3.5" />
              </span>
            )}
            <div
              className={cn(
                'rounded-2xl px-3 py-2 text-sm leading-5',
                compact ? 'max-w-[88%]' : 'max-w-[82%] px-4',
                message.role === 'user'
                  ? 'bg-gray-100 text-gray-900'
                  : compact
                    ? 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'
                    : 'bg-slate-50 text-slate-800 ring-1 ring-slate-200',
              )}
            >
              {message.role === 'assistant' ? (
                <AssistantContent content={message.content} pending={message.pending} />
              ) : (
                <span className="whitespace-pre-wrap">{message.content}</span>
              )}

              {/* Source pills — shown inside the bubble for both compact and full */}
              {!message.pending && message.sources && message.sources.length > 0 && (
                <SourceList
                  sources={message.sources}
                  compact={compact}
                  onOpen={onOpenSource}
                />
              )}
            </div>
          </div>
          {!message.pending && message.proposedActions && message.proposedActions.length > 0 && (
            <div className={cn('space-y-2', !compact && 'ml-8 max-w-md')}>
              {message.proposedActions.map((action, i) => (
                <ProposedActionCard
                  key={`${message.id}-${action.type}-${i}`}
                  action={action}
                  onConfirm={onConfirmAction}
                  onReject={onRejectAction}
                  onStatusChange={(status, edited) =>
                    onStatusChange(message.id, message.proposedActions ?? [], i, status, edited)
                  }
                />
              ))}
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
