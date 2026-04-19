'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Hash,
  LogOut,
  MessageCircle,
  Settings,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { chatApi } from '@/lib/api/chat'
import { useAppDispatch, useAppSelector } from '@/lib/store'
import { setChannels, setConversations } from '@/lib/store/chat-slice'

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
  orgId?: string
  memberId?: string
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
  orgId,
  memberId,
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
  const dispatch = useAppDispatch()
  const { channels, conversations } = useAppSelector((state) => state.chat)

  useEffect(() => {
    if (orgId) {
      chatApi.getChannels(orgId).then((data: any) => {
        dispatch(setChannels(data as any[]))
      })
    }
    if (memberId) {
      chatApi.getConversations(memberId).then((data: any) => {
        dispatch(setConversations(data as any[]))
      })
    }
  }, [orgId, memberId, dispatch])

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

  const chatGroups: NavGroup[] = [
    {
      label: 'Channels',
      items: channels.map((c) => ({
        icon: Hash,
        label: c.name,
        href: `chat/channel/${c.id}`,
      })),
    },
    {
      label: 'Direct Messages',
      items: conversations.map((c) => {
        const otherMember = c.members.find(m => m.member.user.displayName !== userDisplayName);
        return {
          icon: MessageCircle,
          label: otherMember?.member.user.displayName || 'Me',
          href: `chat/conversation/${c.id}`,
        };
      }),
    },
  ]

  const allGroups = [...navGroups, ...chatGroups]

  return (
    <div className="flex h-full flex-col">
      {/* Profile card */}
      <div className="px-3 pt-3 pb-2 shrink-0 border-b border-brand-border">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger
              className={cn(
                'flex-1 min-w-0 rounded-xl border border-brand-border bg-white text-left transition-colors hover:bg-brand-light/40',
                sidebarCollapsed
                  ? 'flex items-center justify-center h-10 w-10 flex-none'
                  : 'px-3 py-2.5'
              )}
            >
              {sidebarCollapsed ? (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand to-brand-hover text-white flex items-center justify-center text-[11px] font-bold">
                  {getInitials(userDisplayName)}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-hover text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {getInitials(userDisplayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand truncate leading-tight">{userDisplayName}</p>
                    <p className="text-[11px] text-brand-muted truncate leading-tight">{userEmail}</p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-brand-muted/60 shrink-0" />
                </div>
              )}
            </PopoverTrigger>

            <PopoverContent side="bottom" align="start" sideOffset={6} className="w-52 p-1 gap-0">
              <div className="px-2.5 py-2 border-b border-border/60 mb-1">
                <p className="text-xs font-semibold text-brand truncate">{userDisplayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
              </div>
              <button
                type="button"
                onClick={onProfile}
                className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-brand-muted hover:text-brand hover:bg-accent/60 transition-colors"
              >
                <UserRound className="w-3.5 h-3.5 shrink-0" />
                Profile
              </button>
              <button
                type="button"
                onClick={onSwitchOrg}
                className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-brand-muted hover:text-brand hover:bg-accent/60 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                Switch organization
              </button>
              <button
                type="button"
                onClick={onSettings}
                className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-brand-muted hover:text-brand hover:bg-accent/60 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 shrink-0" />
                Settings
              </button>
              <div className="my-1 border-t border-border/60" />
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/8 transition-colors"
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
              className="h-10 w-10 shrink-0 rounded-xl border border-brand-border bg-white flex items-center justify-center text-brand-muted hover:text-brand hover:bg-brand-light/60 transition-colors"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="mt-2 rounded-xl border border-brand-border bg-white px-3 py-2">
            <p className="font-semibold text-xs text-brand truncate">{orgName}</p>
            <p className="text-brand-muted text-[11px] truncate">{orgSlug}</p>
          </div>
        )}

        {sidebarCollapsed && (
          <div className="mt-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="w-full h-8 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand hover:bg-brand-light/60 transition-colors"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {sidebarCollapsed ? (
          /* Collapsed: flat icon list */
          <div className="space-y-0.5">
            {allGroups.flatMap((g) => g.items).map((item) => {
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
                    'flex items-center justify-center p-2.5 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-brand-muted hover:text-brand hover:bg-brand-light/60'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                </Link>
              )
            })}
          </div>
        ) : (
          /* Expanded: collapsible groups */
          <div className="space-y-4">
            {allGroups.map((group) => {
              const isGroupCollapsed = collapsedGroups.has(group.label)
              return (
                <div key={group.label}>
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-2 mb-1 group"
                  >
                    <span className="text-[11px] font-semibold text-brand-muted/70 uppercase tracking-wider group-hover:text-brand-muted transition-colors">
                      {group.label}
                    </span>
                    {isGroupCollapsed ? (
                      <ChevronDown className="w-3 h-3 text-brand-muted/50 group-hover:text-brand-muted transition-colors" />
                    ) : (
                      <ChevronUp className="w-3 h-3 text-brand-muted/50 group-hover:text-brand-muted transition-colors" />
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
                      <div className="space-y-0.5">
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
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                                isActive
                                  ? 'bg-brand text-white shadow-sm'
                                  : 'text-brand-muted hover:text-brand hover:bg-brand-light/60'
                              )}
                            >
                              <item.icon className="w-4 h-4 shrink-0" />
                              <span className="flex-1 font-medium text-xs">{item.label}</span>
                              {item.badge && item.badge > 0 && (
                                <span
                                  className={cn(
                                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center tabular-nums',
                                    isActive
                                      ? 'bg-white/20 text-white'
                                      : 'bg-brand-light text-brand'
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
