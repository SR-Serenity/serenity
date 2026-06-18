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
  useEffect(() => {
    void useAuthStore.getState().initialize()
  }, [])

  useEffect(() => {
    const initializeTheme = useThemeStore.getState().initialize
    initializeTheme(defaultTheme)
    return listenForSystemThemeChanges()
  }, [defaultTheme])

  return null
}
