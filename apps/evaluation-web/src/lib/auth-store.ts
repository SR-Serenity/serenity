'use client'

import { jwtDecode } from 'jwt-decode'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AuthSession, EvalUser } from './types'
import { loginToSerenity } from './api-client'

type JwtPayload = {
  user_id?: string
  sub?: string
  email?: string
  displayName?: string
  exp?: number
}

function decodeUser(token: string): EvalUser | null {
  try {
    const p = jwtDecode<JwtPayload>(token)
    const id = p.user_id ?? p.sub
    if (!id || !p.email) return null
    return { id, email: p.email, displayName: p.displayName ?? p.email.split('@')[0] }
  } catch {
    return null
  }
}

export function isExpired(token: string): boolean {
  try {
    const p = jwtDecode<JwtPayload>(token)
    return p.exp ? Date.now() >= p.exp * 1000 : false
  } catch {
    return true
  }
}

type Store = {
  session: AuthSession | null
  hydrated: boolean
  setHydrated: () => void
  login: (email: string, password: string, orgSlug?: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<Store>()(
  persist(
    (set) => ({
      session: null,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

      login: async (email, password, orgSlug) => {
        const data = await loginToSerenity(email, password, orgSlug)
        if (!data.accessToken || !data.organization) {
          throw new Error('No session in response')
        }
        const user = decodeUser(data.accessToken)
        if (!user) throw new Error('Invalid token')
        set({
          session: {
            token: data.accessToken,
            user,
            org: data.organization,
          },
        })
      },

      logout: () => set({ session: null }),
    }),
    {
      name: 'eval-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist the session, not hydrated flag
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    },
  ),
)
