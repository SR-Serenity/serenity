'use client'

import { useEffect } from 'react'
import {
  listenForSystemThemeChanges,
  useThemeStore,
  type Theme,
} from '@/stores/theme-store'
import { useAuthStore } from '@/stores/auth-store'

type StoreInitializerProps = {
  defaultTheme?: Theme
}

export function StoreInitializer({ defaultTheme = 'theme-light' }: StoreInitializerProps) {
  const initializeAuth = useAuthStore((state) => state.initialize)
  const initializeTheme = useThemeStore((state) => state.initialize)

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    initializeTheme(defaultTheme)
    return listenForSystemThemeChanges()
  }, [defaultTheme, initializeTheme])

  return null
}
