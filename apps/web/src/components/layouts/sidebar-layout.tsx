import type { ReactNode } from 'react'

interface SidebarLayoutProps {
  sidebar: ReactNode
  header?: ReactNode
  children: ReactNode
}

/**
 * Reusable sidebar layout for workspace pages
 * Sidebar: navigation, workspace info, user
 * Header: page title/breadcrumbs
 * Main: content area
 */
export function SidebarLayout({
  sidebar,
  header,
  children,
}: SidebarLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-brand text-white">
        {sidebar}
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col bg-brand-surface">
        {header && <header className="border-b border-brand-border bg-white">{header}</header>}
        <div className="flex-1">{children}</div>
      </main>
    </div>
  )
}
