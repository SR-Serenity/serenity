'use client'

import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useThemeStore } from '@/stores/theme-store'
import { cn } from '@/lib/utils'
import { Bot, ChevronRight, Moon, Search, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface WorkspaceHeaderProps {
  orgSlug: string
  activeApp?: {
    id: string
    label: string
    icon?: LucideIcon
    href: string
  }
  hasSubnav?: boolean
  navigatorVisible?: boolean
  onToggleNavigator?: () => void
  copilotOpen?: boolean
  onToggleCopilot?: () => void
}

export function WorkspaceHeader({
  orgSlug,
  activeApp,
  hasSubnav,
  navigatorVisible,
  onToggleNavigator,
  copilotOpen,
  onToggleCopilot,
}: WorkspaceHeaderProps) {
  const { theme, setTheme, isDark } = useThemeStore(
    useShallow(s => ({ theme: s.theme, setTheme: s.setTheme, isDark: s.isDark })),
  )
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  const Icon = activeApp?.icon

  return (
    <header className="flex h-11 w-full shrink-0 items-center gap-2 border-b border-divider bg-panel px-4">
      {/* Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {hasSubnav && (
          <button
            type="button"
            title={navigatorVisible ? 'Collapse' : 'Expand'}
            onClick={onToggleNavigator}
            className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-ui hover:text-caption"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="2" width="4" height="11" rx="1" stroke="currentColor" strokeWidth="1.2"/>
              <rect x="6" y="2" width="8" height="11" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </button>
        )}

        {activeApp ? (
          <nav className="flex items-center gap-1.5 text-sm">
            <span className="text-muted">Workspace</span>
            <ChevronRight className="h-3 w-3 shrink-0 text-dimmed" />
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />}
            <span className="font-semibold text-primary-text">{activeApp.label}</span>
          </nav>
        ) : (
          <span className="text-sm font-semibold text-primary-text">Home</span>
        )}
      </div>

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          title="Search  ⌘K"
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-md px-2.5',
            'text-[13px] text-muted transition-colors hover:bg-ui hover:text-caption',
          )}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded bg-surface px-1 py-px text-[10px] text-dimmed sm:inline">⌘K</kbd>
        </button>

        <span className="hidden px-2 text-[11px] text-dimmed xl:inline">{dateLabel}</span>

        <button
          type="button"
          title={isDark ? 'Light mode' : 'Dark mode'}
          onClick={() => setTheme(theme === 'theme-dark' ? 'theme-light' : 'theme-dark')}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-ui hover:text-caption"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {onToggleCopilot && (
          <button
            type="button"
            title="Copilot"
            onClick={onToggleCopilot}
            className={cn(
              'ml-1 flex h-7 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors',
              copilotOpen
                ? 'bg-accent text-white hover:bg-accent/90'
                : 'bg-ui text-content hover:bg-ui-hover',
            )}
          >
            <Bot className="h-3.5 w-3.5 shrink-0" />
            <span>Copilot</span>
          </button>
        )}
      </div>
    </header>
  )
}
