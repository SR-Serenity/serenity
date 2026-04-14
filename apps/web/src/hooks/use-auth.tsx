'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { authApi } from '@serenity/api'
import type { User, OrgSummary, LoginResult } from '@serenity/api'

type AuthState = {
  token: string | null
  user: User | null
  currentOrg: OrgSummary | null
  initializing: boolean
}

type AuthContextValue = AuthState & {
  isAuthenticated: boolean
  login: (email: string, password: string, orgSlug?: string) => Promise<LoginResult>
  register: (payload: {
    email: string
    password: string
    displayName: string
    orgName: string
    orgSlug: string
  }) => Promise<{ slug: string }>
  selectOrg: (orgSlug: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function decodeJwt(token: string): User | null {
  try {
    const payload = jwtDecode<any>(token)
    return {
      id: payload.user_id || payload.sub,
      email: payload.email,
      displayName: payload.displayName,
    }
  } catch {
    return null
  }
}

function persistAuth(token: string, org: OrgSummary): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_org', JSON.stringify(org))
  }

  document.cookie = `auth_token=${token}; path=/; SameSite=Lax; max-age=86400`
  document.cookie = `auth_org_slug=${org.slug}; path=/; SameSite=Lax; max-age=86400`
}

function clearAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_org')
  }

  document.cookie = 'auth_token=; path=/; max-age=0'
  document.cookie = 'auth_org_slug=; path=/; max-age=0'
}

function readPersistedState(): Omit<AuthState, 'initializing'> {
  if (typeof window === 'undefined') {
    return { token: null, user: null, currentOrg: null }
  }

  try {
    const token = localStorage.getItem('auth_token')
    const orgJson = localStorage.getItem('auth_org')
    const currentOrg = orgJson ? JSON.parse(orgJson) : null

    const user = token ? decodeJwt(token) : null

    return { token, user, currentOrg }
  } catch {
    return { token: null, user: null, currentOrg: null }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    ...readPersistedState(),
    initializing: true,
  }))

  useEffect(() => {
    const persisted = readPersistedState()
    setState((prev) => ({
      ...persisted,
      initializing: false,
    }))
  }, [])

  const login = async (
    email: string,
    password: string,
    orgSlug?: string
  ): Promise<LoginResult> => {
    const response = await authApi.login(email, password, orgSlug)

    if (!response.accessToken) {
      throw new Error('No access token in response')
    }

    const user = decodeJwt(response.accessToken)
    if (!user) throw new Error('Invalid token')

    if (response.organization) {
      persistAuth(response.accessToken, response.organization)
      setState({
        token: response.accessToken,
        user,
        currentOrg: response.organization,
        initializing: false,
      })
      return { type: 'single_org', slug: response.organization.slug }
    }

    if (response.organizations && response.organizations.length > 1) {
      return { type: 'multi_org', organizations: response.organizations }
    }

    throw new Error('No organization in response')
  }

  const register = async (input: {
    email: string
    password: string
    displayName: string
    orgName: string
    orgSlug: string
  }): Promise<{ slug: string }> => {
    const response = await authApi.register(input)

    if (!response.accessToken) {
      throw new Error('No access token in response')
    }

    if (!response.organization) {
      throw new Error('No organization in response')
    }

    const user = decodeJwt(response.accessToken)
    if (!user) throw new Error('Invalid token')

    persistAuth(response.accessToken, response.organization)
    setState({
      token: response.accessToken,
      user,
      currentOrg: response.organization,
      initializing: false,
    })

    return { slug: response.organization.slug }
  }

  const selectOrg = async (orgSlug: string): Promise<void> => {
    if (!state.token) throw new Error('Not authenticated')

    const response = await authApi.switchOrg(state.token, orgSlug)

    if (!response.accessToken || !response.organization) {
      throw new Error('Invalid switch-org response')
    }

    const user = decodeJwt(response.accessToken)
    if (!user) throw new Error('Invalid token')

    persistAuth(response.accessToken, response.organization)
    setState({
      token: response.accessToken,
      user,
      currentOrg: response.organization,
      initializing: false,
    })
  }

  const logout = (): void => {
    clearAuth()
    setState({
      token: null,
      user: null,
      currentOrg: null,
      initializing: false,
    })
  }

  const value: AuthContextValue = {
    ...state,
    isAuthenticated: state.token !== null,
    login,
    register,
    selectOrg,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
