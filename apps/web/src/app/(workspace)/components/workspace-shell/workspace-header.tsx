'use client'

import { useMemo, useState, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useThemeStore } from '@/stores/theme-store'
import { cn } from '@/lib/utils'
import { Search, ChevronRight, Moon, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface WorkspaceHeaderProps {
  currentPath: string
  orgSlug: string
  activeApp?: {
    label: string
    icon?: LucideIcon
  }
}

function titleCase(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function WorkspaceHeader({ currentPath, orgSlug, activeApp }: WorkspaceHeaderProps) {
  const { theme, setTheme, isDark } = useThemeStore(
    useShallow((state) => ({
      theme: state.theme,
      setTheme: state.setTheme,
      isDark: state.isDark,
    })),
  )
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const crumbs = useMemo(() => {
    const parts = currentPath.split('/').filter(Boolean)
    const pathWithoutOrg = parts[0] === orgSlug ? parts.slice(1) : parts
    if (pathWithoutOrg.length === 0) return ['Workspace']
    return pathWithoutOrg.map((part, idx) => (idx === 0 && activeApp?.label ? activeApp.label : titleCase(part)))
  }, [activeApp?.label, currentPath, orgSlug])

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
        'flex items-center justify-between shrink-0 h-9 px-4 gap-3 w-full',
        'bg-header border-b border-divider',
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
        {activeApp?.icon && (
          <activeApp.icon className="w-4 h-4 shrink-0 text-content" />
        )}
        <nav className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {crumbs.map((crumb, idx) => (
            <div
              key={`${crumb}-${idx}`}
              className="flex items-center gap-1.5 min-w-0"
            >
              {idx > 0 && (
                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted" />
              )}
              <span
                className={cn(
                  'truncate text-sm',
                  idx === crumbs.length - 1
                    ? 'font-semibold text-caption'
                    : 'text-content',
                )}
              >
                {crumb}
              </span>
            </div>
          ))}
        </nav>
      </div>

      <div className="flex items-center justify-end gap-2 shrink-0 min-w-0">
        <div className="relative hidden sm:block w-56">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search..."
            className={cn(
              'h-8 w-full pl-8 pr-2.5 rounded border outline-none',
              'text-sm bg-transparent',
              'text-caption placeholder:text-muted',
              'border-divider',
              'focus:border-focus',
            )}
          />
        </div>

        <span className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-danger bg-danger/10">
          <span className="w-1.5 h-1.5 rounded-full bg-danger" />
          REC
        </span>

        <span className="hidden md:inline text-xs text-content whitespace-nowrap">
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
