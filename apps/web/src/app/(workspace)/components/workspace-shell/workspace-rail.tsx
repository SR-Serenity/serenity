'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Bot,
  CalendarDays,
  Command,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  MessageSquare,
  Settings2,
  PanelRight,
  Search,
  Settings,
  Shuffle,
} from 'lucide-react'
import { useState } from 'react'
import type { OrgSummary, User } from '@serenity/api'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/app/shared/components/ui/popover'
import { ShellDivider, ShellIconActionButton } from './workspace-shell-primitives'

export interface WorkspaceRailItem {
  id: string
  icon: LucideIcon
  label: string
  href: string
  /** notify dot */
  notify?: boolean
  /** 'top' | 'bottom' | undefined (= middle) */
  position?: 'top' | 'bottom'
}

interface WorkspaceRailProps {
  orgSlug: string
  apps: WorkspaceRailItem[]
  currentPath: string
  navigatorVisible: boolean
  user: User | null
  currentOrg: OrgSummary
  organizations: OrgSummary[]
  switchingOrgSlug?: string | null
  onSwitchOrg: (orgSlug: string) => void
  onLogout: () => void
  /** User initials for the avatar */
  userInitials: string
}

const utilityActions = [
  { id: 'search', title: 'Search', icon: Search },
  { id: 'notifications', title: 'Notifications', icon: Bell },
  { id: 'calendar', title: 'Calendar', icon: CalendarDays },
  { id: 'messages', title: 'Messages', icon: MessageSquare },
  { id: 'inbox', title: 'AI agent', icon: Bot },
  { id: 'notes', title: 'Notes', icon: FileText },
]

function HomeButton({ orgSlug, currentPath }: { orgSlug: string; currentPath: string }) {
  const href = `/${orgSlug}/dashboard`
  const isActive = currentPath === href

  return (
    <Link
      href={href}
      title="Dashboard"
      className={cn(
        'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border outline-none',
        'transition-all duration-150 ease-out',
        'focus-visible:border-focus',
        isActive
          ? 'border-transparent bg-primary/10 text-accent-txt'
          : 'border-transparent bg-transparent text-nav-icon hover:bg-btn-hover hover:text-caption',
      )}
    >
      <Home className="h-4 w-4" />
    </Link>
  )
}

function AppButton({
  item,
  isActive,
  navigatorVisible,
}: {
  item: WorkspaceRailItem
  isActive: boolean
  navigatorVisible: boolean
}) {
  const Icon = item.icon
  // Keep a visible edge when both the app and navigator context are active.
  const navigatorState = isActive && navigatorVisible

  return (
    <Link
      href={item.href}
      title={item.label}
      id={`app-sidebar-${item.id}`}
      className={cn(
        'relative flex items-center justify-center shrink-0 cursor-pointer group',
        'w-9 h-9 rounded-xl border outline-none',
        'transition-colors duration-150',
        'focus-visible:border-focus focus-visible:bg-primary/10',
        isActive
          ? 'bg-primary/10 border-transparent'
          : 'bg-transparent border-transparent hover:bg-btn-hover',
        navigatorState && 'border-btn-border',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center',
          'w-5 h-5',
          'transition-colors duration-150',
          isActive
            ? 'text-accent-txt'
            : 'text-nav-icon group-hover:text-caption',
        )}
      >
        <Icon className="w-4 h-4" />
      </span>

      {item.notify && (
        <span
          className={cn(
            'absolute rounded-full bg-highlight',
            'size-2',
            'top-4 right-1.5',
          )}
        />
      )}
    </Link>
  )
}

function AccountPopover({
  orgSlug,
  user,
  currentOrg,
  organizations,
  switchingOrgSlug,
  onSwitchOrg,
  onLogout,
  userInitials,
}: {
  orgSlug: string
  user: User | null
  currentOrg: OrgSummary
  organizations: OrgSummary[]
  switchingOrgSlug?: string | null
  onSwitchOrg: (orgSlug: string) => void
  onLogout: () => void
  userInitials: string
}) {
  const otherOrganizations = organizations.filter(org => org.slug !== currentOrg.slug)

  return (
    <Popover>
      <PopoverTrigger
        id="profile-button"
        title="Account"
        className={cn(
          'mt-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full',
          'border border-avatar-border bg-avatar text-xs font-semibold text-caption',
          'outline-none transition-opacity hover:opacity-80 focus-visible:border-focus',
        )}
      >
        {userInitials}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={10}
        className="w-72 gap-1 rounded-xl border border-divider bg-panel p-2 text-content shadow-lg ring-0"
      >
        <PopoverHeader className="gap-2 rounded-xl bg-btn-hover p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-avatar-border bg-avatar text-sm font-semibold text-caption">
              {userInitials}
            </div>
            <div className="min-w-0">
              <PopoverTitle className="truncate text-sm font-semibold text-primary-text">
                {user?.displayName ?? 'Member'}
              </PopoverTitle>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
          </div>
          <div className="rounded-lg border border-divider bg-panel px-2 py-1.5">
            <p className="truncate text-sm font-medium text-primary-text">{currentOrg.name}</p>
            <p className="text-xs text-muted">{currentOrg.role}</p>
          </div>
        </PopoverHeader>

        <Link
          href={`/${orgSlug}/settings`}
          className="flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-content transition-colors hover:bg-btn-hover hover:text-caption"
        >
          <Settings2 className="h-4 w-4 text-muted" />
          Settings
        </Link>
        <Link
          href={`/${orgSlug}/settings?tab=organization`}
          className="flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-content transition-colors hover:bg-btn-hover hover:text-caption"
        >
          <Settings className="h-4 w-4 text-muted" />
          Organization settings
        </Link>

        <ShellDivider className="my-1" />

        <div className="px-3 py-1 text-xs font-medium uppercase text-tertiary-text">
          Switch workspace
        </div>
        {otherOrganizations.length > 0 ? (
          otherOrganizations.map(org => (
            <button
              key={org.id}
              type="button"
              onClick={() => onSwitchOrg(org.slug)}
              disabled={switchingOrgSlug === org.slug}
              className="flex min-h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-content transition-colors hover:bg-btn-hover hover:text-caption disabled:cursor-wait disabled:opacity-60"
            >
              <Shuffle className="h-4 w-4 shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate">{org.name}</span>
              <span className="shrink-0 text-xs text-muted">{org.role}</span>
            </button>
          ))
        ) : (
          <div className="rounded-xl px-3 py-2 text-sm text-muted">
            No other workspaces available.
          </div>
        )}

        <ShellDivider className="my-1" />

        <button
          type="button"
          onClick={onLogout}
          className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-danger transition-colors hover:bg-danger/10"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Vertical application rail for workspace navigation and account actions.
 */
export function WorkspaceRail({
  orgSlug,
  apps,
  currentPath,
  navigatorVisible,
  user,
  currentOrg,
  organizations,
  switchingOrgSlug,
  onSwitchOrg,
  onLogout,
  userInitials,
}: WorkspaceRailProps) {
  const topApps = apps.filter(a => a.position === 'top')
  const midApps = apps.filter(a => !a.position || (a.position !== 'top' && a.position !== 'bottom'))
  const bottomApps = apps.filter(a => a.position === 'bottom')

  function isActive(item: WorkspaceRailItem) {
    return currentPath === item.href || currentPath.startsWith(item.href + '/')
  }

  return (
    <aside
      className={cn(
        'flex flex-col items-center justify-between shrink-0',
        'h-full',
        'w-17',
        'bg-nav',
        'border-r border-nav-divider',
      )}
    >
      <div className="flex flex-col items-center mt-5 w-full">
        <div className="mb-1">
          <HomeButton orgSlug={orgSlug} currentPath={currentPath} />
        </div>

        {topApps.map(app => (
          <AppButton
            key={app.id}
            item={app}
            isActive={isActive(app)}
            navigatorVisible={navigatorVisible}
          />
        ))}

        {topApps.length > 0 && (midApps.length > 0 || bottomApps.length > 0) && (
          <ShellDivider className="mx-auto mt-4 w-9" />
        )}

        <div className="flex flex-col items-center gap-1 w-full overflow-y-auto no-scrollbar px-3 py-2">
          {midApps.map(app => (
            <AppButton
              key={app.id}
              item={app}
              isActive={isActive(app)}
              navigatorVisible={navigatorVisible}
            />
          ))}
        </div>

        {bottomApps.length > 0 && (
          <>
            <ShellDivider className="mx-auto mt-4 w-9" />
            <div className="flex flex-col items-center gap-1 w-full px-3 py-2">
              {bottomApps.map(app => (
                <AppButton
                  key={app.id}
                  item={app}
                  isActive={isActive(app)}
                  navigatorVisible={navigatorVisible}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div
        className={cn(
          'flex flex-col items-center gap-1 w-full',
          'mb-5 pt-4',
          'border-t border-nav-divider',
        )}
      >
        <ShellIconActionButton
          title="Customize"
          icon={Settings}
        />

        <ShellIconActionButton
          title="Help & Support"
          icon={HelpCircle}
        />

        <AccountPopover
          orgSlug={orgSlug}
          user={user}
          currentOrg={currentOrg}
          organizations={organizations}
          switchingOrgSlug={switchingOrgSlug}
          onSwitchOrg={onSwitchOrg}
          onLogout={onLogout}
          userInitials={userInitials}
        />
      </div>
    </aside>
  )
}

export function WorkspaceUtilityRail() {
  const [activeAction, setActiveAction] = useState('calendar')

  return (
    <aside
      className={cn(
        'flex h-full w-15 shrink-0 flex-col items-center justify-between',
        'bg-nav border border-nav-divider',
        'rounded-xl',
      )}
      aria-label="Quick actions"
    >
      <div className="flex w-full flex-col items-center gap-1 px-2 pt-5">
        <ShellIconActionButton title="Panel" icon={PanelRight} />
        <ShellDivider className="my-2 w-8" />
        {utilityActions.map(action => (
          <ShellIconActionButton
            key={action.id}
            title={action.title}
            icon={action.icon}
            active={activeAction === action.id}
            onClick={() => setActiveAction(action.id)}
          />
        ))}
      </div>

      <div className="flex w-full flex-col items-center gap-1 px-2 pb-5">
        <ShellDivider className="mb-2 w-8" />
        <ShellIconActionButton title="Command menu" icon={Command} />
      </div>
    </aside>
  )
}
