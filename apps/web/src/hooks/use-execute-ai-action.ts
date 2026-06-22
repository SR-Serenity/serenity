'use client'

import { calendarApi, tasksApi, wikiApi } from '@serenity/api'
import type { AiProposedAction } from '@serenity/api'
import { useAuthStore } from '@/stores/auth-store'
import { useCopilotContextStore } from '@/stores/copilot-context-store'
import { unixToIso } from '@/lib/time'

export function useExecuteAiAction() {
  const token = useAuthStore(s => s.token)
  const currentOrg = useAuthStore(s => s.currentOrg)

  return async function executeAction(action: AiProposedAction): Promise<void> {
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
    } else if (action.type === 'CREATE_EVENT') {
      await calendarApi.createItem(token, {
        type: 'EVENT',
        visibility: (p.visibility as 'COMPANY' | 'PERSONAL') ?? 'PERSONAL',
        title: String(p.title ?? 'New event'),
        startAt: unixToIso(p.startAt as number | null | undefined),
        endAt: unixToIso(p.endAt as number | null | undefined),
        location: p.location as string | undefined,
        attendeeIds: (p.attendeeIds as string[]) ?? [],
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
    } else if (action.type === 'DRAFT_EMAIL') {
      useCopilotContextStore.getState().setPendingMailDraft({
        to: String(p.to ?? ''),
        subject: String(p.subject ?? ''),
        body: String(p.body ?? ''),
      })
    } else if (action.type === 'DRAFT_CHAT_MESSAGE') {
      useCopilotContextStore.getState().setPendingChatInsert(String(p.content ?? ''))
    }
  }
}
