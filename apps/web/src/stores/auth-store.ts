'use client'

import { jwtDecode } from 'jwt-decode'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { authApi } from '@serenity/api'
import type { LoginResult, OrgSummary, User } from '@serenity/api'

type AuthState = {
  token: string | null
  user: User | null
  currentOrg: OrgSummary | null
  initializing: boolean
}

type RegisterInput = {
  email: string
  password: string
  displayName: string
  orgName: string
  orgSlug: string
}

type AuthActions = {
  initialize: () => Promise<void>
  login: (email: string, password: string, orgSlug?: string) => Promise<LoginResult>
  register: (payload: RegisterInput) => Promise<{ slug: string }>
  selectOrg: (orgSlug: string) => Promise<void>
  setSession: (token: string, org: OrgSummary, fallbackDisplayName?: string) => User
  logout: () => void
}

export type AuthStore = AuthState & AuthActions

type JwtUserPayload = {
  user_id?: string
  sub?: string
  email?: string
  displayName?: string
  exp?: number
}

const emptyAuthState: AuthState = {
  token: null,
  user: null,
  currentOrg: null,
  initializing: true,
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = jwtDecode<JwtUserPayload>(token)
    if (!payload.exp) {
      return false
    }
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

function deriveDisplayName(payload: JwtUserPayload, fallback?: string): string {
  if (payload.displayName && payload.displayName.trim().length > 0) {
    return payload.displayName
  }

  if (fallback && fallback.trim().length > 0) {
    return fallback
  }

  if (payload.email && payload.email.includes('@')) {
    return payload.email.split('@')[0]
  }

  return 'Member'
}

function tokenHasDisplayName(token: string): boolean {
  try {
    const payload = jwtDecode<JwtUserPayload>(token)
    return Boolean(payload.displayName?.trim())
  } catch {
    return false
  }
}

export function decodeJwt(token: string, fallbackDisplayName?: string): User | null {
  try {
    const payload = jwtDecode<JwtUserPayload>(token)
    const id = payload.user_id ?? payload.sub
    const email = payload.email
    const displayName = deriveDisplayName(payload, fallbackDisplayName)

    if (!id || !email) {
      return null
    }

    return {
      id,
      email,
      displayName,
    }
  } catch {
    return null
  }
}

function writeAuthCookies(token: string, org: OrgSummary): void {
  if (typeof document === 'undefined') return

  document.cookie = `auth_token=${token}; path=/; SameSite=Lax; max-age=86400`
  document.cookie = `auth_org_slug=${org.slug}; path=/; SameSite=Lax; max-age=86400`
}

function clearAuthCookies(): void {
  if (typeof document === 'undefined') return

  document.cookie = 'auth_token=; path=/; max-age=0'
  document.cookie = 'auth_org_slug=; path=/; max-age=0'
}

function clearLegacyAuthStorage(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_org')
}

function readJson<T>(value: string | null): T | null {
  if (!value) return null

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function readInviteSession(): { token: string; org: OrgSummary } | null {
  if (typeof window === 'undefined') return null

  const token = localStorage.getItem('invite_access_token')
  if (!token) return null

  localStorage.removeItem('invite_access_token')
  const org = readJson<OrgSummary>(localStorage.getItem('invite_org'))
  localStorage.removeItem('invite_org')

  if (!org) return null

  return { token, org }
}

function readLegacySession(): { token: string; org: OrgSummary } | null {
  if (typeof window === 'undefined') return null

  const token = localStorage.getItem('auth_token')
  const org = readJson<OrgSummary>(localStorage.getItem('auth_org'))

  if (!token || !org) return null

  return { token, org }
}

function clearExpiredSession(set: (state: Partial<AuthStore>) => void): void {
  clearLegacyAuthStorage()
  clearAuthCookies()
  set({ token: null, user: null, currentOrg: null, initializing: false })
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...emptyAuthState,

      initialize: async () => {
        if (typeof window === 'undefined') {
          set({ initializing: false })
          return
        }

        await useAuthStore.persist.rehydrate()

        const inviteSession = readInviteSession()
        if (inviteSession) {
          get().setSession(inviteSession.token, inviteSession.org)
          set({ initializing: false })
          return
        }

        const persistedToken = get().token
        const persistedOrg = get().currentOrg
        const persistedUser = get().user
        if (persistedToken && persistedOrg) {
          if (isTokenExpired(persistedToken)) {
            clearExpiredSession(set)
            return
          }

          let user = decodeJwt(persistedToken, persistedUser?.displayName)
          if (!user) {
            clearExpiredSession(set)
            return
          }

          if (!tokenHasDisplayName(persistedToken)) {
            try {
              const profile = await authApi.profile(persistedToken)
              if (profile?.id && profile.email && profile.displayName) {
                user = profile
              }
            } catch {
              // Keep the locally decoded session when profile refresh is unavailable.
            }
          }

          clearLegacyAuthStorage()
          writeAuthCookies(persistedToken, persistedOrg)
          set({ user, initializing: false })
          return
        }

        const legacySession = readLegacySession()
        if (legacySession) {
          if (isTokenExpired(legacySession.token)) {
            clearExpiredSession(set)
            return
          }

          get().setSession(legacySession.token, legacySession.org)
          set({ initializing: false })
          return
        }

        set({ initializing: false })
      },

      login: async (email, password, orgSlug) => {
        const response = await authApi.login(email, password, orgSlug)

        if (!response.accessToken) {
          throw new Error('No access token in response')
        }

        if (response.organization) {
          get().setSession(response.accessToken, response.organization, response.user?.displayName)
          return { type: 'single_org', slug: response.organization.slug }
        }

        if (response.organizations && response.organizations.length > 1) {
          return { type: 'multi_org', organizations: response.organizations }
        }

        throw new Error('No organization in response')
      },

      register: async (input) => {
        const response = await authApi.register(input)

        if (!response.accessToken) {
          throw new Error('No access token in response')
        }

        if (!response.organization) {
          throw new Error('No organization in response')
        }

        get().setSession(response.accessToken, response.organization, response.user?.displayName)
        return { slug: response.organization.slug }
      },

      selectOrg: async (orgSlug) => {
        const { token, user } = get()
        if (!token) {
          throw new Error('Not authenticated')
        }

        const response = await authApi.switchOrg(token, orgSlug)

        if (!response.accessToken || !response.organization) {
          throw new Error('Invalid switch-org response')
        }

        get().setSession(response.accessToken, response.organization, user?.displayName)
      },

      setSession: (token, org, fallbackDisplayName) => {
        const user = decodeJwt(token, fallbackDisplayName)
        if (!user) {
          throw new Error('Invalid token')
        }

        clearLegacyAuthStorage()
        writeAuthCookies(token, org)
        set({
          token,
          user,
          currentOrg: org,
          initializing: false,
        })

        return user
      },

      logout: () => {
        clearLegacyAuthStorage()
        clearAuthCookies()
        set({
          token: null,
          user: null,
          currentOrg: null,
          initializing: false,
        })
      },
    }),
    {
      name: 'serenity-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        currentOrg: state.currentOrg,
      }),
      skipHydration: true,
    },
  ),
)
