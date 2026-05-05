'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'theme-dark' | 'theme-light' | 'theme-system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'theme-dark',
  setTheme: (t: Theme) => {
    void t
  },
  isDark: true,
})

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'theme-dark') return true
  if (theme === 'theme-light') return false
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: Theme): void {
  const isDark = resolveIsDark(theme)
  const htmlEl = document.documentElement
  htmlEl.classList.remove('theme-dark', 'theme-light')
  htmlEl.classList.add(isDark ? 'theme-dark' : 'theme-light')
}

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({ children, defaultTheme = 'theme-light' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme | null) ?? defaultTheme
    setThemeState(saved)
    applyTheme(saved)

    if (saved === 'theme-system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('theme-system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [defaultTheme])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('theme', t)
    applyTheme(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark: resolveIsDark(theme) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
