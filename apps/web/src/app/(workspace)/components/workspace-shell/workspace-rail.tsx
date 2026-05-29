'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  CalendarDays,
  Command,
  HelpCircle,
  Home,
  LogOut,
  Maximize2,
  MoreVertical,
  PanelRight,
  Plus,
  Settings,
  Settings2,
  Shuffle,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { OrgSummary, User } from '@serenity/api'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/app/shared/components/ui/popover'
import { AiChatPanel } from './ai-agent-panel'
import { ShellDivider, ShellIconActionButton } from './workspace-shell-primitives'
import { useAiAgentStore } from '@/stores/ai-agent-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

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
  { id: 'calendar', title: 'Calendar', icon: CalendarDays },
  { id: 'copilot', title: 'Copilot', icon: Bot },
] as const

type UtilityActionId = typeof utilityActions[number]['id']
type AddonViewId = UtilityActionId | 'add'

const routeAddonConflicts: Array<{ addon: UtilityActionId; segment: string }> = [
  { addon: 'calendar', segment: 'calendar' },
]

function getConflictingAddon(currentPath: string): UtilityActionId | null {
  const pathSegments = currentPath.split('?')[0].split('/').filter(Boolean)
  const activeSegment = pathSegments[1]
  return routeAddonConflicts.find(item => item.segment === activeSegment)?.addon ?? null
}

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
      <Home className="h-4.5 w-4.5" />
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
        <Icon className="h-4.5 w-[18px]" />
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

function CalendarAddonPanel() {
  const today = new Date()
  const days = Array.from({ length: 14 }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() + index)
    return day
  })

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-divider bg-surface p-3">
        <p className="text-sm font-semibold text-primary-text">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
        <p className="mt-1 text-sm text-muted">No scheduled events.</p>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const isToday = day.toDateString() === today.toDateString()
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={cn(
                'flex h-10 flex-col items-center justify-center rounded-lg text-xs transition-colors',
                isToday ? 'bg-primary/10 text-accent-txt' : 'text-content hover:bg-btn-hover',
              )}
            >
              <span className="text-[10px] text-muted">
                {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
              </span>
              <span className="font-semibold">{day.getDate()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AddonContent({
  activeView,
  onSelectView,
}: {
  activeView: AddonViewId
  onSelectView: (view: UtilityActionId) => void
}) {
  if (activeView === 'add') {
    return (
      <div className="space-y-2">
        <p className="px-1 text-xs font-medium text-muted">Add a panel view</p>
        {utilityActions.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onSelectView(action.id)}
              className="flex h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-sm text-content transition-colors hover:bg-btn-hover hover:text-caption"
            >
              <Icon className="h-4 w-4 text-muted" />
              <span>{action.title}</span>
            </button>
          )
        })}
      </div>
    )
  }

  if (activeView === 'calendar') return <CalendarAddonPanel />

  if (activeView === 'copilot') {
    return <AiChatPanel compact={true} />
  }
  return null
}

function WorkspaceAddonPanel({
  activeView,
  onExpand,
  onClose,
  onSelectView,
}: {
  activeView: AddonViewId
  onExpand: () => void
  onClose: () => void
  onSelectView: (view: UtilityActionId) => void
}) {
  const action = activeView === 'add'
    ? { title: 'Add view', icon: Plus }
    : utilityActions.find(item => item.id === activeView) ?? utilityActions[0]
  const Icon = action.icon
  const aiPanel = activeView === 'copilot'

  return (
    <aside
      className={cn(
        'flex h-full w-90 shrink-0 flex-col overflow-hidden rounded-xl border',
        aiPanel ? 'border-blue-100 bg-[#f7f9ff]' : 'border-nav-divider bg-panel',
      )}
      aria-label={`${action.title} panel`}
    >
      <div className={cn('flex h-14 shrink-0 items-center justify-between border-b px-4', aiPanel ? 'border-blue-100' : 'border-nav-divider')}>
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', aiPanel ? 'bg-white text-[#2f6fed] shadow-sm ring-1 ring-blue-100' : 'bg-btn-hover text-caption')}>
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="truncate text-sm font-semibold text-primary-text">{action.title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <ShellIconActionButton title="Expand panel" icon={Maximize2} onClick={onExpand} />
          <ShellIconActionButton title="Panel options" icon={MoreVertical} />
          <ShellIconActionButton title="Close panel" icon={X} onClick={onClose} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <AddonContent activeView={activeView} onSelectView={onSelectView} />
      </div>
    </aside>
  )
}

export function WorkspaceUtilityRail({ basePath, currentPath }: { basePath: string; currentPath: string }) {
  const router = useRouter()

  // Initialize state from localStorage
  const getSavedState = () => {
    if (typeof window === 'undefined') return { activeView: 'calendar' as AddonViewId, panelOpen: false }
    const saved = localStorage.getItem('workspace-panel-state')
    if (saved) {
      try {
        const state = JSON.parse(saved)
        return { activeView: state.activeView ?? 'calendar', panelOpen: state.panelOpen ?? false }
      } catch {
        return { activeView: 'calendar' as AddonViewId, panelOpen: false }
      }
    }
    return { activeView: 'calendar' as AddonViewId, panelOpen: false }
  }

  const initialState = getSavedState()
  const [activeView, setActiveView] = useState<AddonViewId>(initialState.activeView)
  const [panelOpen, setPanelOpen] = useState(initialState.panelOpen)

  const currentPathOnly = currentPath.split('?')[0]
  const copilotExpanded = currentPathOnly.endsWith('/copilot')

  // Restore panel state on mount (only if copilot is not expanded to full page)
  useEffect(() => {
    if (!copilotExpanded && initialState.panelOpen) {
      setPanelOpen(true)
      setActiveView(initialState.activeView)
    }
  }, [])

  // Persist panel state whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const state = { activeView, panelOpen }
    localStorage.setItem('workspace-panel-state', JSON.stringify(state))
  }, [activeView, panelOpen])

  const conflictingAddon = useMemo(() => getConflictingAddon(currentPath), [currentPath])
  const aiPanelOpenRequest = useWorkspaceStore(state => state.aiPanelOpenRequest)
  const aiPanelOpenAfterNavigation = useWorkspaceStore(state => state.aiPanelOpenAfterNavigation)
  const consumeOpenAiPanelAfterNavigation = useWorkspaceStore(state => state.consumeOpenAiPanelAfterNavigation)
  const copilotDisplayMode = useWorkspaceStore(state => state.copilotDisplayMode)
  const setCopilotDisplayMode = useWorkspaceStore(state => state.setCopilotDisplayMode)
  const activeSessionId = useAiAgentStore(state => state.activeSessionId)

  useEffect(() => {
    if (panelOpen && activeView === conflictingAddon) {
      setPanelOpen(false)
    }
  }, [activeView, conflictingAddon, panelOpen])

  useEffect(() => {
    if (aiPanelOpenRequest > 0 && conflictingAddon !== 'copilot') {
      setActiveView('copilot')
      setPanelOpen(true)
    }
  }, [aiPanelOpenRequest, conflictingAddon])

  useEffect(() => {
    if (!aiPanelOpenAfterNavigation || copilotExpanded) return
    setActiveView('copilot')
    setPanelOpen(true)
    setCopilotDisplayMode('addon')
    consumeOpenAiPanelAfterNavigation()
  }, [aiPanelOpenAfterNavigation, consumeOpenAiPanelAfterNavigation, copilotExpanded, setCopilotDisplayMode])

  function openView(view: AddonViewId) {
    if (view === conflictingAddon) return
    if (view === 'copilot' && copilotExpanded) {
      const query = currentPath.includes('?') ? currentPath.split('?')[1] : ''
      const from = new URLSearchParams(query).get('from')
      useWorkspaceStore.getState().requestOpenAiPanelAfterNavigation()
      setCopilotDisplayMode('addon')
      router.push(from && from.startsWith(basePath) && !from.includes('/copilot') ? from : `${basePath}/dashboard`)
      return
    }
    if (view === 'copilot' && copilotDisplayMode === 'expanded') {
      const params = new URLSearchParams()
      if (activeSessionId) params.set('session', activeSessionId)
      if (!copilotExpanded) params.set('from', currentPath)
      setPanelOpen(false)
      router.push(`${basePath}/copilot${params.toString() ? `?${params.toString()}` : ''}`)
      return
    }
    setActiveView(view)
    setPanelOpen(true)
  }

  function expandPanel() {
    if (activeView === 'copilot') {
      const params = new URLSearchParams()
      if (activeSessionId) params.set('session', activeSessionId)
      if (!copilotExpanded) params.set('from', currentPath)
      setCopilotDisplayMode('expanded')
      setPanelOpen(false)
      router.push(`${basePath}/copilot${params.toString() ? `?${params.toString()}` : ''}`)
      return
    }
    setPanelOpen(false)
  }

  return (
    <>
      {panelOpen && (
        <WorkspaceAddonPanel
          activeView={activeView}
          onExpand={expandPanel}
          onClose={() => setPanelOpen(false)}
          onSelectView={openView}
        />
      )}

      <aside
        className={cn(
          'flex h-full w-15 shrink-0 flex-col items-center justify-between',
          'bg-nav border border-nav-divider',
          'rounded-xl',
        )}
        aria-label="Quick actions"
      >
        <div className="flex w-full flex-col items-center gap-1 px-2 pt-5">
          <ShellIconActionButton
            title={panelOpen ? 'Close side panel' : 'Open side panel'}
            icon={PanelRight}
            active={panelOpen}
            onClick={() => setPanelOpen((open: boolean) => !open)}
          />
          <ShellDivider className="my-2 w-8" />
          {utilityActions.map(action => (
            <ShellIconActionButton
              key={action.id}
              title={action.id === conflictingAddon ? `${action.title} is already open` : action.title}
              icon={action.icon}
              active={(panelOpen && activeView === action.id) || (action.id === 'copilot' && copilotExpanded)}
              disabled={action.id === conflictingAddon}
              onClick={() => openView(action.id)}
            />
          ))}
          <ShellDivider className="my-2 w-8" />
          <ShellIconActionButton
            title="Add view"
            icon={Plus}
            active={panelOpen && activeView === 'add'}
            onClick={() => openView('add')}
          />
        </div>

        <div className="flex w-full flex-col items-center gap-1 px-2 pb-5">
          <ShellDivider className="mb-2 w-8" />
          <ShellIconActionButton title="Command menu" icon={Command} />
        </div>
      </aside>
    </>
  )
}
