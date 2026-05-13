'use client'

import { create } from 'zustand'
import { authApi, chatApi } from '@serenity/api'
import type { ChatConversation, OrgSummary } from '@serenity/api'

type WorkspaceState = {
  navigatorVisible: boolean
  organizations: OrgSummary[]
  chatConversations: ChatConversation[]
  chatNavSearch: string
  switchingOrgSlug: string | null
}

type WorkspaceActions = {
  setNavigatorVisible: (visible: boolean | ((visible: boolean) => boolean)) => void
  setOrganizations: (organizations: OrgSummary[]) => void
  loadOrganizations: (token: string | null, currentOrg: OrgSummary | null) => Promise<void>
  setChatConversations: (conversations: ChatConversation[]) => void
  loadChatConversations: (token: string | null, shouldLoad: boolean) => Promise<void>
  setChatNavSearch: (search: string) => void
  setSwitchingOrgSlug: (orgSlug: string | null) => void
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions

export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => ({
  navigatorVisible: true,
  organizations: [],
  chatConversations: [],
  chatNavSearch: '',
  switchingOrgSlug: null,

  setNavigatorVisible: (visible) => {
    set({
      navigatorVisible:
        typeof visible === 'function' ? visible(get().navigatorVisible) : visible,
    })
  },

  setOrganizations: (organizations) => set({ organizations }),

  loadOrganizations: async (token, currentOrg) => {
    if (!token || !currentOrg) {
      set({ organizations: [] })
      return
    }

    try {
      const response = await authApi.organizations(token)
      set({ organizations: response.organizations })
    } catch {
      set({ organizations: [currentOrg] })
    }
  },

  setChatConversations: (chatConversations) => set({ chatConversations }),

  loadChatConversations: async (token, shouldLoad) => {
    if (!token || !shouldLoad) {
      set({ chatConversations: [] })
      return
    }

    try {
      const response = await chatApi.listConversations(token)
      set({ chatConversations: response.conversations })
    } catch {
      set({ chatConversations: [] })
    }
  },

  setChatNavSearch: (chatNavSearch) => set({ chatNavSearch }),
  setSwitchingOrgSlug: (switchingOrgSlug) => set({ switchingOrgSlug }),
}))
