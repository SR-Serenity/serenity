'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useThemeStore } from '@/stores/theme-store'
import { cn } from '@/lib/utils'
import { Moon, Plus, Sun, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface WorkspaceHeaderProps {
  currentPath: string
  orgSlug: string
  activeApp?: {
    id: string
    label: string
    icon?: LucideIcon
    href: string
  }
}

interface WorkspaceTab {
  id: string
  label: string
  href: string
  icon?: LucideIcon
}

let nextTabId = 1

export function WorkspaceHeader({ currentPath, orgSlug, activeApp }: WorkspaceHeaderProps) {
  const router = useRouter()
  const { theme, setTheme, isDark } = useThemeStore(
    useShallow((state) => ({
      theme: state.theme,
      setTheme: state.setTheme,
      isDark: state.isDark,
    })),
  )
  const [now, setNow] = useState(() => new Date())
  const fallbackTab = useMemo<WorkspaceTab>(() => ({
    id: 'tab-0',
    label: 'Dashboard',
    href: `/${orgSlug}/dashboard`,
  }), [orgSlug])
  const currentRouteTab = useMemo<Omit<WorkspaceTab, 'id'>>(() => {
    if (!activeApp) {
      return {
        label: fallbackTab.label,
        href: fallbackTab.href,
      }
    }

    return {
      label: activeApp.label,
      href: currentPath,
      icon: activeApp.icon,
    }
  }, [activeApp, currentPath, fallbackTab])
  const [activeTabId, setActiveTabId] = useState(fallbackTab.id)
  const [tabs, setTabs] = useState<WorkspaceTab[]>([fallbackTab])
  const activeTab = tabs.find(tab => tab.id === activeTabId) ?? tabs[0] ?? fallbackTab

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setTabs((currentTabs) => {
      if (currentTabs.length === 0) {
        return [{ id: activeTabId, ...currentRouteTab }]
      }

      return currentTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, ...currentRouteTab } : tab,
      )
    })
  }, [activeTabId, currentRouteTab])

  const closeTab = useCallback((tabId: string) => {
    setTabs((currentTabs) => {
      if (currentTabs.length === 1) return currentTabs

      const tabIndex = currentTabs.findIndex(tab => tab.id === tabId)
      if (tabIndex === -1) return currentTabs

      const nextTabs = currentTabs.filter(tab => tab.id !== tabId)
      if (tabId === activeTabId) {
        const nextTab = nextTabs[Math.max(0, tabIndex - 1)] ?? nextTabs[0]
        setActiveTabId(nextTab.id)
        router.push(nextTab.href)
      }

      return nextTabs
    })
  }, [activeTabId, router])

  const openNewTab = useCallback(() => {
    const tab: WorkspaceTab = {
      id: `tab-${nextTabId++}`,
      label: 'Dashboard',
      href: `/${orgSlug}/dashboard`,
    }

    setTabs(currentTabs => [...currentTabs, tab])
    setActiveTabId(tab.id)
    router.push(tab.href)
  }, [orgSlug, router])

  const dateTimeLabel = now.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <header
      className={cn(
        'flex h-9 w-full shrink-0 items-end gap-2 overflow-hidden px-2 pt-1',
        'border-b border-divider bg-header',
      )}
    >
      <nav className="flex min-w-0 flex-1 items-end gap-1 overflow-hidden">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id
          const Icon = tab.icon

          return (
            <div
              key={tab.id}
              title={tab.label}
              className={cn(
                'group relative flex h-8 min-w-0 max-w-52 flex-1 items-center gap-2 rounded-t-md border px-2.5 text-sm transition-colors',
                isActive
                  ? 'z-10 border-divider border-b-panel bg-panel text-caption shadow-sm'
                  : 'border-divider bg-surface text-content hover:bg-panel hover:text-caption',
              )}
            >
              <Link
                href={tab.href}
                onClick={() => setActiveTabId(tab.id)}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                {Icon && <Icon className="h-4 w-4 shrink-0 text-muted" />}
                <span className="truncate font-medium">{tab.label}</span>
              </Link>
              <button
                type="button"
                title={`Close ${tab.label}`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  closeTab(tab.id)
                }}
                className={cn(
                  'ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted transition-colors',
                  'opacity-0 hover:bg-btn-hover hover:text-caption group-hover:opacity-100 focus-visible:opacity-100',
                  isActive && 'opacity-100',
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}

        <button
          type="button"
          onClick={openNewTab}
          title="New tab"
          className="mb-0.5 flex h-7 w-8 shrink-0 items-center justify-center rounded-md text-content transition-colors hover:bg-btn-hover hover:text-caption"
        >
          <Plus className="h-[18px] w-[18px]" />
        </button>
      </nav>

      <div className="flex h-8 shrink-0 items-center justify-end gap-2 pb-0.5">
        <span className="inline-flex h-6 items-center gap-1 rounded px-2 text-xs font-semibold text-danger bg-danger/10">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          REC
        </span>

        <span className="hidden whitespace-nowrap text-xs text-content md:inline">
          {dateTimeLabel}
        </span>

        <button
          type="button"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setTheme(theme === 'theme-dark' ? 'theme-light' : 'theme-dark')}
          className={cn(
            'h-8 w-8 inline-flex items-center justify-center rounded',
            'text-content hover:bg-btn-hover',
          )}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  )
}
