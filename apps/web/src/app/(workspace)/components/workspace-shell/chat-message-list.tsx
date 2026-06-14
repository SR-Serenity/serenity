'use client'

import type { RefObject } from 'react'
import { Bot, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AiProposedAction, AiSource } from '@serenity/api'
import { useCopilotContextStore } from '@/stores/copilot-context-store'
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
  const insertAction = useCopilotContextStore(s => s.insertAction)
  const setPendingChatInsert = useCopilotContextStore(s => s.setPendingChatInsert)

  return (
    <div className={cn('space-y-3', !compact && 'pb-2')}>
      {messages.map(message => (
        <div key={message.id} className="space-y-2">
          <div className={cn('group flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
            {!compact && message.role === 'assistant' && (
              <span className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Bot className="h-3.5 w-3.5" />
              </span>
            )}
            <div className={cn('relative', compact ? 'max-w-[88%]' : 'max-w-[82%]')}>
              <div
                className={cn(
                  'rounded-2xl px-3 py-2 text-sm leading-5',
                  !compact && 'px-4',
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : compact
                      ? 'bg-white text-slate-700 shadow-sm ring-1 ring-blue-100'
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

              {/* Hover action: add to chat input — only for assistant messages with chat insert action */}
              {message.role === 'assistant' && !message.pending && insertAction?.type === 'chat' && message.content && (
                <button
                  type="button"
                  onClick={() => setPendingChatInsert(message.content)}
                  className="absolute -bottom-2 right-1 flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500 opacity-0 shadow-sm transition-opacity hover:border-blue-300 hover:text-blue-600 group-hover:opacity-100"
                  title="Add to message input"
                >
                  <PenLine className="h-2.5 w-2.5" />
                  Use
                </button>
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
