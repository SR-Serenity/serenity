'use client'

import { LogOut } from 'lucide-react'

interface WorkspaceSidebarProps {
  orgName: string
  orgSlug: string
  userDisplayName: string
  userEmail: string
  navItems: Array<{ icon: React.ComponentType<{ className?: string }>; label: string }>
  onLogout: () => void
}

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

/**
 * Workspace sidebar: org header, navigation, user footer
 * Scales with new nav items and user features
 */
export function WorkspaceSidebar({
  orgName,
  orgSlug,
  userDisplayName,
  userEmail,
  navItems,
  onLogout,
}: WorkspaceSidebarProps) {
  return (
    <>
      {/* Workspace header */}
      <div className="px-4 py-4 border-b border-white/10">
        <p className="font-semibold text-sm truncate">{orgName}</p>
        <p className="text-white/50 text-xs truncate">{orgSlug}</p>
      </div>

      {/* Navigation - easily add new items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors text-left"
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-white/10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold shrink-0">
          {getInitials(userDisplayName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{userDisplayName}</p>
          <p className="text-xs text-white/50 truncate">{userEmail}</p>
        </div>
        <button
          onClick={onLogout}
          title="Sign out"
          className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </>
  )
}
