'use client'

import type { ReactNode } from 'react'
import { Bell, ChevronDown, LogOut, Settings, Sparkles, User } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

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
  const { user, logout } = useAuth()

  return (
    <div className="h-screen w-full bg-sidebar flex overflow-hidden shadow-2xl">
      {/* Permanent Narrow Sidebar Area */}
      <aside className="w-24 shrink-0 flex flex-col h-full overflow-hidden text-white">
        {sidebar}
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-10 shrink-0 flex items-center justify-end px-6 gap-4">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all border border-primary/20 group">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold tracking-wide">AI Assistant</span>
          </button>
          
          <div className="flex items-center gap-4 border-l border-white/10 pl-4">
            <button className="relative p-2 text-white/40 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
            </button>

            <Popover>
              <PopoverTrigger>
                <div className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-semibold overflow-hidden group-hover:bg-white/15 transition-all">
                    {userInitials}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                      {userDisplayName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2 bg-white border border-gray-200 text-gray-900 shadow-2xl gap-1 ring-1 ring-black/5">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold text-gray-900">{userDisplayName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <button className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-gray-50 transition-colors text-left text-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                    Profile
                  </button>
                  <button className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-gray-50 transition-colors text-left text-gray-700">
                    <Settings className="w-4 h-4 text-gray-400" />
                    Settings
                  </button>
                </div>
                <button 
                  onClick={() => logout()}
                  className="flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-red-50 text-red-600 transition-colors text-left w-full font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* White Content Canvas */}
        <main className="flex-1 bg-white rounded-l-2xl overflow-hidden">
          <div className="h-full w-full overflow-y-auto no-scrollbar">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
