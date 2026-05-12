import { api } from './client'
import type {
  ListDepartmentsResponse,
  ListMembersResponse,
  ListInvitationsResponse,
  CreateInvitationResponse,
  CreateInvitationInput,
  CreateDepartmentInput,
  WorkspaceRole,
} from '../types/members'

export const orgApi = {
  listDepartments: async (orgId: string, token: string): Promise<ListDepartmentsResponse> => {
    return api.get(`auth/departments`, {
      token,
    })
  },

  createDepartment: async (orgId: string, token: string, input: CreateDepartmentInput) => {
    return api.post(`auth/departments`, {
      token,
      body: input,
    })
  },

  updateDepartment: async (orgId: string, token: string, departmentId: string, input: CreateDepartmentInput) => {
    return api.patch(`auth/departments/${departmentId}`, {
      token,
      body: input,
    })
  },

  deleteDepartment: async (orgId: string, token: string, departmentId: string) => {
    return api.delete(`auth/departments/${departmentId}`, {
      token,
    })
  },

  listMembers: async (orgId: string, token: string): Promise<ListMembersResponse> => {
    return api.get(`organizations/${orgId}/members`, {
      token,
    })
  },

  updateMemberRole: async (
    orgId: string,
    token: string,
    memberUserId: string,
    role: WorkspaceRole
  ) => {
    return api.patch(`organizations/${orgId}/members/${memberUserId}/role`, {
      token,
      body: { role },
    })
  },

  updateMemberDepartment: async (
    orgId: string,
    token: string,
    memberUserId: string,
    departmentId: string | null
  ) => {
    return api.patch(`organizations/${orgId}/members/${memberUserId}/department`, {
      token,
      body: departmentId ? { departmentId } : {},
    })
  },

  listInvitations: async (orgId: string, token: string): Promise<ListInvitationsResponse> => {
    return api.get(`auth/invitations`, {
      token,
    })
  },

  createInvitation: async (
    orgId: string,
    token: string,
    input: CreateInvitationInput
  ): Promise<CreateInvitationResponse> => {
    return api.post(`auth/invitations`, {
      token,
      body: input,
    })
  },

  revokeInvitation: async (orgId: string, token: string, invitationId: string) => {
    return api.delete(`auth/invitations/${invitationId}`, {
      token,
    })
  },
}
