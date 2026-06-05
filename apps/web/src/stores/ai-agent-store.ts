'use client'

import { create } from 'zustand'
import type { AiProposedAction, AiSessionSummary, AiSource } from '@serenity/api'

export type AiChatEntry = {
  id: string
  role: 'user' | 'assistant'
  content: string
  pending?: boolean
  sources?: AiSource[]
  proposedActions?: AiProposedAction[]
}

type Updater<T> = T | ((current: T) => T)

type AiAgentState = {
  sessions: AiSessionSummary[]
  activeSessionId: string | null
  messages: AiChatEntry[]
  prompt: string
  sending: boolean
  loadingSession: boolean
  setSessions: (sessions: Updater<AiSessionSummary[]>) => void
  setActiveSessionId: (sessionId: string | null) => void
  setMessages: (messages: Updater<AiChatEntry[]>) => void
  setPrompt: (prompt: string) => void
  setSending: (sending: boolean) => void
  setLoadingSession: (loading: boolean) => void
  resetConversation: () => void
}

export const useAiAgentStore = create<AiAgentState>()((set) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  prompt: '',
  sending: false,
  loadingSession: false,
  setSessions: sessions => set(state => ({
    sessions: typeof sessions === 'function' ? sessions(state.sessions) : sessions,
  })),
  setActiveSessionId: activeSessionId => set({ activeSessionId }),
  setMessages: messages => set(state => ({
    messages: typeof messages === 'function' ? messages(state.messages) : messages,
  })),
  setPrompt: prompt => set({ prompt }),
  setSending: sending => set({ sending }),
  setLoadingSession: loadingSession => set({ loadingSession }),
  resetConversation: () => set({
    activeSessionId: null,
    messages: [],
    prompt: '',
    sending: false,
    loadingSession: false,
  }),
}))
