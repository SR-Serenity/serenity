'use client'

import { create } from 'zustand'
import { authApi } from '@serenity/api'
import type { OrgSummary } from '@serenity/api'

type WorkspaceState = {
  navigatorVisible: boolean
  organizations: OrgSummary[]
  chatNavSearch: string
  switchingOrgSlug: string | null
}

type WorkspaceActions = {
  setNavigatorVisible: (visible: boolean | ((visible: boolean) => boolean)) => void
  setOrganizations: (organizations: OrgSummary[]) => void
  loadOrganizations: (token: string | null, currentOrg: OrgSummary | null) => Promise<void>
  setChatNavSearch: (search: string) => void
  setSwitchingOrgSlug: (orgSlug: string | null) => void
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions

export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => ({
  navigatorVisible: true,
  organizations: [],
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

  setChatNavSearch: (chatNavSearch) => set({ chatNavSearch }),
  setSwitchingOrgSlug: (switchingOrgSlug) => set({ switchingOrgSlug }),
}))
