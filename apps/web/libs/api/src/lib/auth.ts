import { api } from './client'
import type { AuthResponse, AcceptInvitationResponse, OrgSummary } from '../types'

export const authApi = {
  login: async (email: string, password: string, orgSlug?: string): Promise<AuthResponse> => {
    return api.post('auth/login', {
      body: {
        email,
        password,
        orgSlug: orgSlug || undefined,
      },
    })
  },

  register: async (input: {
    email: string
    password: string
    displayName: string
    orgName: string
    orgSlug: string
  }): Promise<AuthResponse> => {
    return api.post('auth/register', {
      body: input,
    })
  },

  registerWithInvite: async (input: {
    email: string
    password: string
    displayName: string
    inviteToken: string
  }): Promise<AcceptInvitationResponse> => {
    return api.post('auth/register-with-invite', {
      body: input,
    })
  },

  switchOrg: async (token: string, orgSlug: string): Promise<AuthResponse> => {
    return api.post('auth/switch-org', {
      token,
      body: { orgSlug },
    })
  },

  organizations: async (token: string): Promise<{ organizations: OrgSummary[] }> => {
    return api.get('auth/organizations', {
      token,
    })
  },

  acceptInvitation: async (token: string): Promise<AcceptInvitationResponse> => {
    return api.post('auth/invitations/accept', {
      body: { token },
    })
  },
}
