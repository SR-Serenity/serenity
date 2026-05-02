'use client'

import type { ReactNode } from 'react'
import { Bell, ChevronDown, Sparkles } from 'lucide-react'

interface SidebarLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  userDisplayName: string
  userInitials: string
}

export function SidebarLayout({
  sidebar,
  children,
  userDisplayName,
  userInitials,
}: SidebarLayoutProps) {
  return (
    <div className="h-screen w-full bg-sidebar flex overflow-hidden shadow-2xl">
      {/* Permanent Narrow Sidebar Area */}
      <aside className="w-26 shrink-0 flex flex-col h-full overflow-hidden">
        {sidebar}
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 shrink-0 flex items-center justify-end px-8 gap-6">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all border border-primary/20 group">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wide">AI Assistant</span>
            </button>
            <button className="relative p-2 text-white/40 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-white/5">
              <div className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
                {userInitials}
              </div>
              <div className="flex items-center gap-2 cursor-pointer group">
                <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                  {userDisplayName}
                </span>
                <ChevronDown className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
              </div>
            </div>
          </div>
        </header>

        {/* White Content Canvas */}
        <main className="flex-1 bg-white rounded-tl-2xl overflow-hidden">
          <div className="h-full w-full overflow-y-auto no-scrollbar">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
