import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const selectedPage = useWikiStore(state => state.selectedPage)
  const activeConversationId = useChatStore(state => state.activeConversationId)
  const conversations = useChatStore(state => state.conversations)
  const selectedTaskId = useTaskStore(state => state.selectedTaskId)
  const tasks = useTaskStore(state => state.tasks)

  const requestContext: AiRequestContext = { timeZone: browserTimezone() }

  const isWikiSurface = pathname?.includes('/wiki')
  const isChatSurface = pathname?.includes('/chat')
  const isTaskSurface = pathname?.includes('/tasks')

  if (isWikiSurface && selectedPage) {
    requestContext.wikiPageId = selectedPage.id
    return {
      contextLabel: selectedPage.title || 'Untitled page',
      requestContext,
    }
  }

  if (isChatSurface && activeConversationId) {
    const conversation = conversations.find(c => c.id === activeConversationId)
    const label = conversation?.name
      ?? (conversation?.members.length
        ? conversation.members.map(m => m.user.displayName).join(', ')
        : null)
      ?? 'Conversation'
    requestContext.conversationId = activeConversationId
    return { contextLabel: label, requestContext }
  }

  if (isTaskSurface && selectedTaskId) {
    const task = tasks.find(t => t.id === selectedTaskId)
    requestContext.taskId = selectedTaskId
    return { contextLabel: task?.title ?? 'Task', requestContext }
  }

  if (selectedPage) {
    requestContext.wikiPageId = selectedPage.id
    return {
      contextLabel: selectedPage.title || 'Untitled page',
      requestContext,
    }
  }

  if (activeConversationId) {
    const conversation = conversations.find(c => c.id === activeConversationId)
    const label = conversation?.name
      ?? (conversation?.members.length
        ? conversation.members.map(m => m.user.displayName).join(', ')
        : null)
      ?? 'Conversation'
    requestContext.conversationId = activeConversationId
    return { contextLabel: label, requestContext }
  }

  if (selectedTaskId) {
    const task = tasks.find(t => t.id === selectedTaskId)
    requestContext.taskId = selectedTaskId
    return { contextLabel: task?.title ?? 'Task', requestContext }
  }

  return { contextLabel: null, requestContext }
}
