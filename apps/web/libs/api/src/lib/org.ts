import { request } from './client'
import type {
  ListDepartmentsResponse,
  ListMembersResponse,
  ListInvitationsResponse,
  CreateInvitationInput,
  CreateDepartmentInput,
  WorkspaceRole,
} from '../types/members'

export const orgApi = {
  listDepartments: async (orgId: string, token: string): Promise<ListDepartmentsResponse> => {
    return request(`auth/departments`, {
      token,
      method: 'GET',
    })
  },

  createDepartment: async (orgId: string, token: string, input: CreateDepartmentInput) => {
    return request(`auth/departments`, {
      token,
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updateDepartment: async (orgId: string, token: string, departmentId: string, input: CreateDepartmentInput) => {
    return request(`auth/departments/${departmentId}`, {
      token,
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  deleteDepartment: async (orgId: string, token: string, departmentId: string) => {
    return request(`auth/departments/${departmentId}`, {
      token,
      method: 'DELETE',
    })
  },

  listMembers: async (orgId: string, token: string): Promise<ListMembersResponse> => {
    return request(`organizations/${orgId}/members`, {
      token,
      method: 'GET',
    })
  },

  updateMemberRole: async (
    orgId: string,
    token: string,
    memberUserId: string,
    role: WorkspaceRole
  ) => {
    return request(`organizations/${orgId}/members/${memberUserId}/role`, {
      token,
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
  },

  updateMemberDepartment: async (
    orgId: string,
    token: string,
    memberUserId: string,
    departmentId: string | null
  ) => {
    return request(`organizations/${orgId}/members/${memberUserId}/department`, {
      token,
      method: 'PATCH',
      body: JSON.stringify(departmentId ? { departmentId } : {}),
    })
  },

  listInvitations: async (orgId: string, token: string): Promise<ListInvitationsResponse> => {
    return request(`auth/invitations`, {
      token,
      method: 'GET',
    })
  },

  createInvitation: async (
    orgId: string,
    token: string,
    input: CreateInvitationInput
  ) => {
    return request(`auth/invitations`, {
      token,
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  revokeInvitation: async (orgId: string, token: string, invitationId: string) => {
    return request(`auth/invitations/${invitationId}`, {
      token,
      method: 'DELETE',
    })
  },
}