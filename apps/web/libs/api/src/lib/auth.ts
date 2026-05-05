import { request } from './client'
import type { AuthResponse, AcceptInvitationResponse, OrgSummary } from '../types'

export const authApi = {
  login: async (email: string, password: string, orgSlug?: string): Promise<AuthResponse> => {
    return request('auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        orgSlug: orgSlug || undefined,
      }),
    })
  },

  register: async (input: {
    email: string
    password: string
    displayName: string
    orgName: string
    orgSlug: string
  }): Promise<AuthResponse> => {
    return request('auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  registerWithInvite: async (input: {
    email: string
    password: string
    displayName: string
    inviteToken: string
  }): Promise<AcceptInvitationResponse> => {
    return request('auth/register-with-invite', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  switchOrg: async (token: string, orgSlug: string): Promise<AuthResponse> => {
    return request('auth/switch-org', {
      token,
      method: 'POST',
      body: JSON.stringify({ orgSlug }),
    })
  },

  organizations: async (token: string): Promise<{ organizations: OrgSummary[] }> => {
    return request('auth/organizations', {
      token,
      method: 'GET',
    })
  },

  acceptInvitation: async (token: string): Promise<AcceptInvitationResponse> => {
    return request('auth/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },
}
