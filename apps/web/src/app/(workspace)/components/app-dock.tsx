'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Settings, HelpCircle } from 'lucide-react'
import { ShellDivider, ShellIconActionButton } from './shell-primitives'

export interface AppItem {
  id: string
  icon: LucideIcon
  label: string
  href: string
  /** notify dot */
  notify?: boolean
  /** 'top' | 'bottom' | undefined (= middle) */
  position?: 'top' | 'bottom'
}

interface AppDockProps {
  orgSlug: string
  orgName: string
  apps: AppItem[]
  currentPath: string
  navigatorVisible: boolean
  onOpenAccountPopup: () => void
  /** User initials for the avatar */
  userInitials: string
}

/**
 * Organization shortcut shown at the top of the dock.
 */
function WorkspaceLogo({ orgName, orgSlug }: { orgName: string; orgSlug: string }) {
  const initial = orgName.trim().toUpperCase()[0] ?? '?'
  return (
    <Link
      href={`/${orgSlug}/dashboard`}
      title={orgName}
      className={cn(
        'flex items-center justify-center shrink-0 cursor-pointer rounded',
        'w-8 h-8',
        'text-white font-medium text-sm leading-none',
        'bg-accent',
        'hover:opacity-80 transition-opacity outline-none',
      )}
    >
      {initial}
    </Link>
  )
}

function AppButton({
  item,
  isActive,
  navigatorVisible,
}: {
  item: AppItem
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
        'w-9 h-9 rounded border outline-none',
        'transition-colors duration-150',
        isActive
          ? 'bg-btn-pressed border-transparent'
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
            ? 'text-caption'
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

/**
 * Vertical application dock for workspace navigation and account actions.
 */
export function AppDock({
  orgSlug,
  orgName,
  apps,
  currentPath,
  navigatorVisible,
  onOpenAccountPopup,
  userInitials,
}: AppDockProps) {
  const topApps = apps.filter(a => a.position === 'top')
  const midApps = apps.filter(a => !a.position || (a.position !== 'top' && a.position !== 'bottom'))
  const bottomApps = apps.filter(a => a.position === 'bottom')

  function isActive(item: AppItem) {
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
        'rounded-tl-lg rounded-bl-lg',
      )}
    >
      <div className="flex flex-col items-center mt-5 w-full">
        <div className="mb-1">
          <WorkspaceLogo orgName={orgName} orgSlug={orgSlug} />
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

        <button
          type="button"
          id="profile-button"
          title="Account"
          onClick={onOpenAccountPopup}
          className={cn(
            'flex items-center justify-center cursor-pointer mt-3',
            'w-8 h-8 rounded-full',
            'bg-avatar border border-avatar-border',
            'text-caption text-xs font-semibold',
            'hover:opacity-80 transition-opacity outline-none',
          )}
        >
          {userInitials}
        </button>
      </div>
    </aside>
  )
}
