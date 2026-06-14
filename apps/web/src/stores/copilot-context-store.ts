'use client'

import { create } from 'zustand'

export type CopilotInsertAction = {
  label: string
  /** 'chat' populates the message input; 'wiki' applies to the open wiki editor */
  type?: 'chat' | 'wiki'
  /** For wiki type: the page ID this action targets */
  pageId?: string
  execute: (content: string) => Promise<void>
}

type CopilotContextState = {
  insertAction: CopilotInsertAction | null
  /** Text to populate into the active chat message input. Consumed once read. */
  pendingChatInsert: string | null
}

type CopilotContextActions = {
  setInsertAction: (action: CopilotInsertAction | null) => void
  setPendingChatInsert: (text: string | null) => void
}

export type CopilotContextStore = CopilotContextState & CopilotContextActions

export const useCopilotContextStore = create<CopilotContextStore>(set => ({
  insertAction: null,
  pendingChatInsert: null,
  setInsertAction: action => set({ insertAction: action }),
  setPendingChatInsert: text => set({ pendingChatInsert: text }),
}))
