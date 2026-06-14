import { useWikiStore } from '@/stores/wiki-store'
import { useChatStore } from '@/stores/chat-store'
import { useTaskStore } from '@/stores/task-store'
import type { AiRequestContext } from '@serenity/api'
import { browserTimezone } from '@/lib/time'

export type AiContextResult = {
  contextLabel: string | null
  requestContext: AiRequestContext
}

export function useAiContext(): AiContextResult {
  const selectedPage = useWikiStore(state => state.selectedPage)
  const activeConversationId = useChatStore(state => state.activeConversationId)
  const conversations = useChatStore(state => state.conversations)
  const selectedTaskId = useTaskStore(state => state.selectedTaskId)
  const tasks = useTaskStore(state => state.tasks)

  if (selectedPage) {
    return {
      contextLabel: selectedPage.title || 'Untitled page',
      requestContext: {
        wikiPageId: selectedPage.id,
        timeZone: browserTimezone(),
      },
    }
  }

  if (activeConversationId) {
    const conversation = conversations.find(c => c.id === activeConversationId)
    const label = conversation?.name
      ?? (conversation?.members.length
        ? conversation.members.map(m => m.user.displayName).join(', ')
        : null)
      ?? 'Conversation'
    return {
      contextLabel: label,
      requestContext: {
        conversationId: activeConversationId,
        timeZone: browserTimezone(),
      },
    }
  }

  if (selectedTaskId) {
    const task = tasks.find(t => t.id === selectedTaskId)
    return {
      contextLabel: task?.title ?? 'Task',
      requestContext: {
        taskId: selectedTaskId,
        timeZone: browserTimezone(),
      },
    }
  }

  return { contextLabel: null, requestContext: { timeZone: browserTimezone() } }
}
