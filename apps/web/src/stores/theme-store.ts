'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Theme = 'theme-dark' | 'theme-light' | 'theme-system'

type ThemeState = {
  theme: Theme
  isDark: boolean
}

type ThemeActions = {
  initialize: (defaultTheme?: Theme) => void
  setTheme: (theme: Theme) => void
}

export type ThemeStore = ThemeState & ThemeActions

function isTheme(value: unknown): value is Theme {
  return value === 'theme-dark' || value === 'theme-light' || value === 'theme-system'
}

export function resolveIsDark(theme: Theme): boolean {
  if (theme === 'theme-dark') return true
  if (theme === 'theme-light') return false
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: Theme): boolean {
  const isDark = resolveIsDark(theme)
  if (typeof document !== 'undefined') {
    const htmlEl = document.documentElement
    htmlEl.classList.remove('theme-dark', 'theme-light')
    htmlEl.classList.add(isDark ? 'theme-dark' : 'theme-light')
  }
  return isDark
}

function readLegacyTheme(): Theme | null {
  if (typeof window === 'undefined') return null

  const rawTheme = localStorage.getItem('theme')
  if (!isTheme(rawTheme)) return null

  localStorage.removeItem('theme')
  return rawTheme
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'theme-light',
      isDark: false,

      initialize: (defaultTheme = 'theme-light') => {
        if (typeof window === 'undefined') return

        const legacyTheme = readLegacyTheme()
        const theme = legacyTheme ?? get().theme ?? defaultTheme
        const isDark = applyTheme(theme)
        set({ theme, isDark })
      },

      setTheme: (theme) => {
        const isDark = applyTheme(theme)
        set({ theme, isDark })
      },
    }),
    {
      name: 'serenity-theme',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
      }),
    },
  ),
)

export function listenForSystemThemeChanges(): () => void {
  if (typeof window === 'undefined') return () => undefined

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => {
    if (useThemeStore.getState().theme === 'theme-system') {
      useThemeStore.setState({ isDark: applyTheme('theme-system') })
    }
  }

  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
