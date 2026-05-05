'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { AppDock, type AppItem } from './app-dock'
import type { NavSection } from './nav-panel'
import { WorkspaceHeader } from './workspace-header'

interface WorkbenchLayoutProps {
  apps: AppItem[]
  sections: NavSection[]
  children: ReactNode
  /** Current page path for active state highlighting */
  currentPath: string
}

/** Shared workspace shell: header + app dock + content canvas. */
export function WorkbenchLayout({
  apps,
  sections,
  children,
  currentPath,
}: WorkbenchLayoutProps) {
  const { user } = useAuth()
  const orgSlug = currentPath.split('/').filter(Boolean)[0] ?? ''

  const userInitials = (user?.displayName ?? user?.email ?? 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('')

  // Find active app for navigator title
  const activeApp = apps.find(
    a => currentPath === a.href || currentPath.startsWith(a.href + '/'),
  )

  return (
    <div className="relative flex w-full h-screen overflow-hidden flex-col bg-back">
      <WorkspaceHeader
        currentPath={currentPath}
        orgSlug={orgSlug}
        activeApp={activeApp ? { label: activeApp.label, icon: activeApp.icon } : undefined}
      />

      <div
        className={cn(
          'flex w-full flex-1 min-w-0 min-h-0',
          'rounded-lg',
          'overflow-hidden',
          /* subtle outer border — mirrors ::after inset border */
          'ring-1 ring-inset ring-divider',
        )}
        
      >
        {/* ── 1. AppDock ── */}
        <AppDock
          orgSlug={orgSlug}
          orgName={activeApp?.label ?? 'Workspace'}
          apps={apps}
          currentPath={currentPath}
          navigatorVisible
          onOpenAccountPopup={() => {
            /* handled by Popover below – we pass through a ref trick via portal */
          }}
          userInitials={userInitials}
        />

        {/* ── 2. Navigator Panel (collapsible) ── */}
        {/* NavPanel removed as requested */}

        {/* ── 3. Content area ── */}
        <div
          className={cn(
            'flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden bg-surface',
          )}
        >
          {/* Main content canvas */}
          <main className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full w-full overflow-y-auto no-scrollbar">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
