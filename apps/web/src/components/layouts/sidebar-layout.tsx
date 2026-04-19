'use client'

import type { ReactNode } from 'react'
import { Resizable } from 'react-resizable'
import type { ResizeCallbackData } from 'react-resizable'

interface SidebarLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  sidebarWidth: number
  sidebarCollapsed: boolean
  onSidebarWidthChange: (width: number) => void
}

const MIN_SIDEBAR_WIDTH = 240
const MAX_SIDEBAR_WIDTH = 420
const COLLAPSED_WIDTH = 88

export function SidebarLayout({
  sidebar,
  children,
  sidebarWidth,
  sidebarCollapsed,
  onSidebarWidthChange,
}: SidebarLayoutProps) {
  const clampedWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, sidebarWidth))

  function handleResize(_event: React.SyntheticEvent, data: ResizeCallbackData) {
    onSidebarWidthChange(data.size.width)
  }

  return (
    <div className="h-screen overflow-hidden bg-brand-surface p-3 md:p-4">
      <div className="mx-auto flex h-full w-full max-w-[1600px] overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
        {/* Sidebar */}
        {sidebarCollapsed ? (
          <aside
            style={{ width: COLLAPSED_WIDTH }}
            className="shrink-0 flex flex-col h-full bg-brand-surface/70 border-r border-brand-border overflow-hidden transition-[width] duration-200"
          >
            {sidebar}
          </aside>
        ) : (
          <Resizable
            width={clampedWidth}
            height={0}
            axis="x"
            minConstraints={[MIN_SIDEBAR_WIDTH, 0]}
            maxConstraints={[MAX_SIDEBAR_WIDTH, 0]}
            onResize={handleResize}
            handle={
              <span
                className="absolute top-0 -right-1 h-full w-2 cursor-col-resize hover:bg-brand/30 active:bg-brand/50 transition-colors duration-150"
                role="separator"
                aria-label="Resize sidebar"
              />
            }
          >
            <aside
              style={{ width: clampedWidth }}
              className="relative shrink-0 flex flex-col h-full bg-brand-surface/70 border-r border-brand-border overflow-hidden"
            >
              {sidebar}
            </aside>
          </Resizable>
        )}

        {/* Main — each page renders its own header + content */}
        <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  )
}
