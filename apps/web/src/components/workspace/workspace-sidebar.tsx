'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

interface WorkspaceSidebarProps {
  orgName: string
  orgSlug: string
  userDisplayName: string
  userEmail: string
  sidebarCollapsed: boolean
  basePath: string
  currentPath: string
  navGroups: NavGroup[]
  onProfile: () => void
  onSwitchOrg: () => void
  onSettings: () => void
  onLogout: () => void
  onToggleCollapse: () => void
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function WorkspaceSidebar({
  orgName,
  orgSlug,
  userDisplayName,
  userEmail,
  sidebarCollapsed,
  basePath,
  currentPath,
  navGroups,
  onProfile,
  onSwitchOrg,
  onSettings,
  onLogout,
  onToggleCollapse,
}: WorkspaceSidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  function resolveHref(href: string) {
    return `${basePath}/${href}`
  }

  return (
    <div className="flex h-full flex-col">
      {/* Profile card */}
      <div className="px-3 pt-4 pb-3 shrink-0 border-b border-slate-300">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger
              className={cn(
                'flex-1 min-w-0 rounded-lg text-left transition-colors hover:bg-slate-100 border border-transparent hover:border-slate-300',
                sidebarCollapsed
                  ? 'flex items-center justify-center h-10 w-10 flex-none'
                  : 'px-2 py-1.5'
              )}
            >
              {sidebarCollapsed ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                  {getInitials(userDisplayName)}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                    {getInitials(userDisplayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-950 truncate leading-tight">{userDisplayName}</p>
                    <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">{orgName}</p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              )}
            </PopoverTrigger>

            <PopoverContent side="bottom" align="start" sideOffset={8} className="w-56 p-1.5 shadow-xl border-slate-300">
              <div className="px-2.5 py-2.5 border-b border-slate-200 mb-1.5">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Signed in as</p>
                <p className="text-sm font-semibold text-slate-950 truncate">{userDisplayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
              </div>
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={onProfile}
                  className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-colors"
                >
                  <UserRound className="w-3.5 h-3.5 shrink-0" />
                  Profile settings
                </button>
                <button
                  type="button"
                  onClick={onSwitchOrg}
                  className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  Switch organization
                </button>
                <button
                  type="button"
                  onClick={onSettings}
                  className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 shrink-0" />
                  Organization settings
                </button>
              </div>
              <div className="my-1.5 border-t border-slate-200" />
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                Sign out
              </button>
            </PopoverContent>
          </Popover>

          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-950 hover:bg-slate-100 border border-slate-300 shadow-sm transition-colors"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {sidebarCollapsed ? (
          /* Collapsed: flat icon list */
          <div className="space-y-2">
            {navGroups.flatMap((g) => g.items).map((item) => {
              const target = resolveHref(item.href)
              const isActive =
                currentPath === target ||
                (item.href === 'dashboard' &&
                  (currentPath === basePath || currentPath === `${basePath}/`))
              return (
                <Link
                  key={item.label}
                  href={target}
                  title={item.label}
                  className={cn(
                    'flex items-center justify-center h-10 w-10 mx-auto rounded-lg text-sm transition-all border',
                    isActive
                      ? 'bg-slate-900 text-white border-slate-950 shadow-md'
                      : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100 border-transparent'
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                </Link>
              )
            })}
          </div>
        ) : (
          /* Expanded: collapsible groups */
          <div className="space-y-8">
            {navGroups.map((group) => {
              const isGroupCollapsed = collapsedGroups.has(group.label)
              return (
                <div key={group.label}>
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-2 mb-2 group"
                  >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] group-hover:text-slate-500 transition-colors">
                      {group.label}
                    </span>
                    {isGroupCollapsed ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    )}
                  </button>

                  {/* Group items with smooth collapse */}
                  <div
                    className={cn(
                      'grid transition-all duration-200 ease-in-out',
                      isGroupCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const target = resolveHref(item.href)
                          const isActive =
                            currentPath === target ||
                            (item.href === 'dashboard' &&
                              (currentPath === basePath || currentPath === `${basePath}/`))
                          return (
                            <Link
                              key={item.label}
                              href={target}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 border',
                                isActive
                                  ? 'bg-slate-900 text-white font-semibold border-slate-950 shadow-md'
                                  : 'text-slate-600 font-medium hover:text-slate-950 hover:bg-slate-100 border-transparent'
                              )}
                            >
                              <item.icon className={cn("w-4.5 h-4.5 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                              <span className="flex-1">{item.label}</span>
                              {item.badge && item.badge > 0 && (
                                <span
                                  className={cn(
                                    'text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center tabular-nums shadow-sm',
                                    isActive
                                      ? 'bg-white text-slate-950'
                                      : 'bg-slate-200 text-slate-600'
                                  )}
                                >
                                  {item.badge > 99 ? '99+' : item.badge}
                                </span>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </nav>
    </div>
  )
}
