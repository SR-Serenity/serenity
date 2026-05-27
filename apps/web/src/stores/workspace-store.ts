'use client'

import { create } from 'zustand'
import { authApi, orgApi } from '@serenity/api'
import type { Department, Invitation, Member, OrgSummary } from '@serenity/api'

type WorkspaceState = {
  navigatorVisible: boolean
  organizations: OrgSummary[]
  membersByOrgId: Record<string, Member[]>
  departmentsByOrgId: Record<string, Department[]>
  invitationsByOrgId: Record<string, Invitation[]>
  orgDataLoadingByOrgId: Record<string, boolean>
  orgDataErrorByOrgId: Record<string, string | null>
  chatNavSearch: string
  switchingOrgSlug: string | null
  aiPanelOpenRequest: number
  aiPanelOpenAfterNavigation: boolean
  copilotDisplayMode: 'addon' | 'expanded'
}

type LoadOptions = {
  force?: boolean
}

type WorkspaceActions = {
  setNavigatorVisible: (visible: boolean | ((visible: boolean) => boolean)) => void
  setOrganizations: (organizations: OrgSummary[]) => void
  loadOrganizations: (token: string | null, currentOrg: OrgSummary | null) => Promise<void>
  loadMembers: (orgId: string | null | undefined, token: string | null, options?: LoadOptions) => Promise<Member[]>
  loadDepartments: (orgId: string | null | undefined, token: string | null, options?: LoadOptions) => Promise<Department[]>
  loadInvitations: (orgId: string | null | undefined, token: string | null, options?: LoadOptions) => Promise<Invitation[]>
  loadOrgData: (orgId: string | null | undefined, token: string | null, options?: LoadOptions) => Promise<void>
  setChatNavSearch: (search: string) => void
  setSwitchingOrgSlug: (orgSlug: string | null) => void
  requestOpenAiPanel: () => void
  requestOpenAiPanelAfterNavigation: () => void
  consumeOpenAiPanelAfterNavigation: () => void
  setCopilotDisplayMode: (mode: 'addon' | 'expanded') => void
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions

const pendingMemberLoads = new Map<string, Promise<Member[]>>()
const pendingDepartmentLoads = new Map<string, Promise<Department[]>>()
const pendingInvitationLoads = new Map<string, Promise<Invitation[]>>()

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Failed to load workspace data'
}

export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => ({
  navigatorVisible: true,
  organizations: [],
  membersByOrgId: {},
  departmentsByOrgId: {},
  invitationsByOrgId: {},
  orgDataLoadingByOrgId: {},
  orgDataErrorByOrgId: {},
  chatNavSearch: '',
  switchingOrgSlug: null,
  aiPanelOpenRequest: 0,
  aiPanelOpenAfterNavigation: false,
  copilotDisplayMode: 'addon',

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

  loadMembers: async (orgId, token, options = {}) => {
    if (!token || !orgId) return []

    const cached = get().membersByOrgId[orgId]
    if (cached && !options.force) return cached

    const pending = pendingMemberLoads.get(orgId)
    if (pending && !options.force) return pending

    set({
      orgDataLoadingByOrgId: { ...get().orgDataLoadingByOrgId, [orgId]: true },
      orgDataErrorByOrgId: { ...get().orgDataErrorByOrgId, [orgId]: null },
    })

    const request = orgApi.listMembers(orgId, token)
      .then((response) => {
        set({
          membersByOrgId: { ...get().membersByOrgId, [orgId]: response.members },
          orgDataErrorByOrgId: { ...get().orgDataErrorByOrgId, [orgId]: null },
        })
        return response.members
      })
      .catch((error: unknown) => {
        set({
          orgDataErrorByOrgId: { ...get().orgDataErrorByOrgId, [orgId]: errorMessage(error) },
        })
        throw error
      })
      .finally(() => {
        pendingMemberLoads.delete(orgId)
        set({
          orgDataLoadingByOrgId: { ...get().orgDataLoadingByOrgId, [orgId]: false },
        })
      })

    pendingMemberLoads.set(orgId, request)
    return request
  },

  loadDepartments: async (orgId, token, options = {}) => {
    if (!token || !orgId) return []

    const cached = get().departmentsByOrgId[orgId]
    if (cached && !options.force) return cached

    const pending = pendingDepartmentLoads.get(orgId)
    if (pending && !options.force) return pending

    const request = orgApi.listDepartments(orgId, token)
      .then((response) => {
        set({
          departmentsByOrgId: { ...get().departmentsByOrgId, [orgId]: response.departments },
        })
        return response.departments
      })
      .finally(() => {
        pendingDepartmentLoads.delete(orgId)
      })

    pendingDepartmentLoads.set(orgId, request)
    return request
  },

  loadInvitations: async (orgId, token, options = {}) => {
    if (!token || !orgId) return []

    const cached = get().invitationsByOrgId[orgId]
    if (cached && !options.force) return cached

    const pending = pendingInvitationLoads.get(orgId)
    if (pending && !options.force) return pending

    const request = orgApi.listInvitations(orgId, token)
      .then((response) => {
        set({
          invitationsByOrgId: { ...get().invitationsByOrgId, [orgId]: response.invitations },
        })
        return response.invitations
      })
      .finally(() => {
        pendingInvitationLoads.delete(orgId)
      })

    pendingInvitationLoads.set(orgId, request)
    return request
  },

  loadOrgData: async (orgId, token, options = {}) => {
    if (!token || !orgId) return

    set({
      orgDataLoadingByOrgId: { ...get().orgDataLoadingByOrgId, [orgId]: true },
      orgDataErrorByOrgId: { ...get().orgDataErrorByOrgId, [orgId]: null },
    })

    try {
      await Promise.all([
        get().loadMembers(orgId, token, options),
        get().loadDepartments(orgId, token, options),
        get().loadInvitations(orgId, token, options),
      ])
      set({
        orgDataErrorByOrgId: { ...get().orgDataErrorByOrgId, [orgId]: null },
      })
    } catch (error) {
      set({
        orgDataErrorByOrgId: { ...get().orgDataErrorByOrgId, [orgId]: errorMessage(error) },
      })
      throw error
    } finally {
      set({
        orgDataLoadingByOrgId: { ...get().orgDataLoadingByOrgId, [orgId]: false },
      })
    }
  },

  setChatNavSearch: (chatNavSearch) => set({ chatNavSearch }),
  setSwitchingOrgSlug: (switchingOrgSlug) => set({ switchingOrgSlug }),
  requestOpenAiPanel: () => set(state => ({ aiPanelOpenRequest: state.aiPanelOpenRequest + 1 })),
  requestOpenAiPanelAfterNavigation: () => set({ aiPanelOpenAfterNavigation: true }),
  consumeOpenAiPanelAfterNavigation: () => set({ aiPanelOpenAfterNavigation: false }),
  setCopilotDisplayMode: (copilotDisplayMode) => set({ copilotDisplayMode }),
}))
