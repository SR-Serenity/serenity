'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  CalendarDays,
  Check,
  ChevronsUpDown,
  Home,
  LogOut,
  Maximize2,
  MoreVertical,
  PanelRight,
  Plus,
  Settings,
  Settings2,
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
import { DiceBearAvatar } from '@/components/dicebear-avatar'

export interface WorkspaceRailItem {
  id: string
  icon: LucideIcon
  label: string
  href: string
  notify?: boolean
  /** Group label shown as a section header in the sidebar */
  group?: string
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

/* ─── Nav item ─────────────────────────────────────────────────── */
function NavItem({
  icon: Icon,
  label,
  href,
  isActive,
  notify,
}: {
  icon: LucideIcon
  label: string
  href: string
  isActive: boolean
  notify?: boolean
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        'group flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-[13px] font-medium outline-none select-none transition-all duration-150',
        isActive
          ? 'bg-accent/10 text-accent-txt'
          : 'text-content hover:bg-nav-hover hover:text-caption',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors duration-150',
          isActive ? 'text-accent-txt' : 'text-muted group-hover:text-caption',
        )}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {notify && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
    </Link>
  )
}

/* ─── Org header ────────────────────────────────────────────────── */
function OrgHeader({
  orgSlug,
  currentOrg,
  organizations,
  switchingOrgSlug,
  onSwitchOrg,
}: {
  orgSlug: string
  currentOrg: OrgSummary
  organizations: OrgSummary[]
  switchingOrgSlug?: string | null
  onSwitchOrg: (orgSlug: string) => void
}) {
  const otherOrgs = organizations.filter(o => o.slug !== currentOrg.slug)

  return (
    <Popover>
      <PopoverTrigger className={cn(
        'group flex w-full shrink-0 items-center gap-2 rounded-md px-2 py-1.5',
        'transition-colors duration-150 hover:bg-ui outline-none focus-visible:bg-ui',
      )}>
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-[10px] font-bold text-white">
          {currentOrg.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[13px] font-semibold text-primary-text">{currentOrg.name}</p>
        </div>
        <ChevronsUpDown className="h-3 w-3 shrink-0 text-dimmed opacity-0 transition-opacity group-hover:opacity-100" />
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-64 gap-1 rounded-xl border border-divider bg-panel p-2 text-content shadow-lg ring-0"
      >
        <div className="px-2 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wider text-dimmed">
          Workspaces
        </div>

        {/* Current org */}
        <div className="flex items-center gap-2.5 rounded-lg bg-btn-hover px-2.5 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-[10px] font-bold text-white">
            {currentOrg.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-primary-text">{currentOrg.name}</p>
            <p className="text-xs text-dimmed capitalize">{currentOrg.role}</p>
          </div>
          <Check className="h-3.5 w-3.5 shrink-0 text-accent-txt" />
        </div>

        {otherOrgs.length > 0 && (
          <>
            <ShellDivider className="my-1.5" />
            {otherOrgs.map(org => (
              <button
                key={org.id}
                type="button"
                onClick={() => onSwitchOrg(org.slug)}
                disabled={switchingOrgSlug === org.slug}
                className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-btn-hover disabled:opacity-50"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-nav-selected text-[10px] font-bold text-caption">
                  {org.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="min-w-0 flex-1 truncate text-content">{org.name}</span>
                <span className="shrink-0 text-xs text-dimmed capitalize">{org.role}</span>
              </button>
            ))}
          </>
        )}

        <ShellDivider className="my-1.5" />
        <Link
          href={`/${orgSlug}/settings?tab=organization`}
          className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-sm text-content transition-colors hover:bg-btn-hover hover:text-caption"
        >
          <Settings className="h-3.5 w-3.5 text-muted" />
          Organization settings
        </Link>
      </PopoverContent>
    </Popover>
  )
}

/* ─── User section ──────────────────────────────────────────────── */
function UserSection({
  orgSlug,
  user,
  onLogout,
}: {
  orgSlug: string
  user: User | null
  onLogout: () => void
}) {
  const avatarSeed = user?.id ?? user?.email ?? user?.displayName

  return (
    <Popover>
      <PopoverTrigger className={cn(
        'group flex w-full shrink-0 items-center gap-2 rounded-md px-2 py-1.5',
        'transition-colors duration-150 hover:bg-ui outline-none focus-visible:bg-ui',
      )}>
        <DiceBearAvatar seed={avatarSeed} name={user?.displayName} className="h-5 w-5" />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[12px] font-medium text-primary-text leading-snug">
            {user?.displayName ?? 'Member'}
          </p>
        </div>
        <Settings2 className="h-3 w-3 shrink-0 text-dimmed opacity-0 group-hover:opacity-100" />
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-64 gap-1 rounded-xl border border-divider bg-panel p-2 text-content shadow-lg ring-0"
      >
        <PopoverHeader className="gap-2 rounded-lg bg-btn-hover p-3">
          <div className="flex items-center gap-2.5">
            <DiceBearAvatar seed={avatarSeed} name={user?.displayName} className="h-8 w-8 border border-avatar-border" />
            <div className="min-w-0">
              <PopoverTitle className="truncate text-sm font-semibold text-primary-text">
                {user?.displayName ?? 'Member'}
              </PopoverTitle>
              <p className="truncate text-xs text-dimmed">{user?.email}</p>
            </div>
          </div>
        </PopoverHeader>

        <Link
          href={`/${orgSlug}/profile`}
          className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-sm text-content transition-colors hover:bg-btn-hover hover:text-caption"
        >
          <Settings2 className="h-3.5 w-3.5 text-muted" />
          Profile &amp; preferences
        </Link>
        <Link
          href={`/${orgSlug}/settings`}
          className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-sm text-content transition-colors hover:bg-btn-hover hover:text-caption"
        >
          <Settings className="h-3.5 w-3.5 text-muted" />
          Workspace settings
        </Link>

        <ShellDivider className="my-1.5" />

        <button
          type="button"
          onClick={onLogout}
          className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm text-danger transition-colors hover:bg-danger/10"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  )
}

/* ─── Workspace rail ────────────────────────────────────────────── */
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
}: WorkspaceRailProps) {

  function isActive(item: WorkspaceRailItem) {
    return currentPath === item.href || currentPath.startsWith(item.href + '/')
  }

  // Build ordered list of unique groups
  const groups = [...new Set(apps.map(a => a.group).filter(Boolean))] as string[]

  // Map group → items
  const byGroup = apps.reduce<Record<string, WorkspaceRailItem[]>>((acc, app) => {
    const key = app.group ?? '__ungrouped'
    acc[key] = acc[key] ?? []
    acc[key].push(app)
    return acc
  }, {})

  const ungrouped = byGroup['__ungrouped'] ?? []
  const dashboardHref = `/${orgSlug}/dashboard`

  return (
    <aside className="flex h-full w-[172px] shrink-0 flex-col border-r border-nav-divider bg-nav">
      {/* Org header */}
      <div className="shrink-0 px-2.5 pt-2.5 pb-0.5">
        <OrgHeader
          orgSlug={orgSlug}
          currentOrg={currentOrg}
          organizations={organizations}
          switchingOrgSlug={switchingOrgSlug}
          onSwitchOrg={onSwitchOrg}
        />
      </div>

      {/* Nav */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-2.5 py-1.5 space-y-0.5">
        <NavItem
          icon={Home}
          label="Home"
          href={dashboardHref}
          isActive={currentPath === dashboardHref || currentPath === `/${orgSlug}`}
        />

        {ungrouped.map(app => (
          <NavItem
            key={app.id}
            icon={app.icon}
            label={app.label}
            href={app.href}
            isActive={isActive(app)}
            notify={app.notify}
          />
        ))}

        {groups.map(group => (
          <div key={group} className="mt-4 first:mt-2">
            <p className="mb-0.5 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-dimmed/60">
              {group}
            </p>
            {(byGroup[group] ?? []).map(app => (
              <NavItem
                key={app.id}
                icon={app.icon}
                label={app.label}
                href={app.href}
                isActive={isActive(app)}
                notify={app.notify}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Subtle separator */}
      <div className="mx-2.5 h-px bg-nav-divider opacity-50" />

      {/* User section */}
      <div className="shrink-0 px-2.5 py-2">
        <UserSection
          orgSlug={orgSlug}
          user={user}
          onLogout={onLogout}
        />
      </div>
    </aside>
  )
}

/* ─── Addon panel internals ─────────────────────────────────────── */
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
                isToday ? 'bg-accent/10 text-accent-txt' : 'text-content hover:bg-btn-hover',
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
      <div className="space-y-1">
        <p className="px-1 pb-1 text-xs font-medium text-muted">Add a panel</p>
        {utilityActions.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onSelectView(action.id)}
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-content transition-colors hover:bg-btn-hover hover:text-caption"
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
  if (activeView === 'copilot') return <AiChatPanel compact={true} />
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
    ? { title: 'Add panel', icon: Plus }
    : utilityActions.find(item => item.id === activeView) ?? utilityActions[0]
  const Icon = action.icon
  const aiPanel = activeView === 'copilot'

  return (
    <aside
      className={cn(
        'flex h-full w-[320px] shrink-0 flex-col overflow-hidden border-l',
        aiPanel ? 'border-blue-100/60 bg-[#f8faff]' : 'border-divider bg-panel',
      )}
      aria-label={`${action.title} panel`}
    >
      <div className={cn(
        'flex h-11 shrink-0 items-center justify-between px-4',
        aiPanel ? 'border-b border-blue-100/60' : 'border-b border-divider',
      )}>
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={cn('h-4 w-4 shrink-0', aiPanel ? 'text-blue-500' : 'text-muted')} />
          <h2 className="truncate text-[13px] font-semibold text-primary-text">{action.title}</h2>
        </div>
        <div className="flex items-center gap-0.5">
          <ShellIconActionButton title="Expand" icon={Maximize2} onClick={onExpand} />
          <ShellIconActionButton title="Options" icon={MoreVertical} />
          <ShellIconActionButton title="Close" icon={X} onClick={onClose} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <AddonContent activeView={activeView} onSelectView={onSelectView} />
      </div>
    </aside>
  )
}

/* ─── Utility rail (right side) ─────────────────────────────────── */
export function WorkspaceUtilityRail({ basePath, currentPath }: { basePath: string; currentPath: string }) {
  const router = useRouter()

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

  useEffect(() => {
    if (!copilotExpanded && initialState.panelOpen) {
      setPanelOpen(true)
      setActiveView(initialState.activeView)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('workspace-panel-state', JSON.stringify({ activeView, panelOpen }))
  }, [activeView, panelOpen])

  const conflictingAddon = useMemo(() => getConflictingAddon(currentPath), [currentPath])
  const aiPanelOpenRequest = useWorkspaceStore(state => state.aiPanelOpenRequest)
  const aiPanelOpenAfterNavigation = useWorkspaceStore(state => state.aiPanelOpenAfterNavigation)
  const consumeOpenAiPanelAfterNavigation = useWorkspaceStore(state => state.consumeOpenAiPanelAfterNavigation)
  const copilotDisplayMode = useWorkspaceStore(state => state.copilotDisplayMode)
  const setCopilotDisplayMode = useWorkspaceStore(state => state.setCopilotDisplayMode)
  const activeSessionId = useAiAgentStore(state => state.activeSessionId)

  useEffect(() => {
    if (panelOpen && activeView === conflictingAddon) setPanelOpen(false)
  }, [activeView, conflictingAddon, panelOpen])

  useEffect(() => {
    if (aiPanelOpenRequest > 0 && conflictingAddon !== 'copilot') {
      setActiveView('copilot'); setPanelOpen(true)
    }
  }, [aiPanelOpenRequest, conflictingAddon])

  useEffect(() => {
    if (!aiPanelOpenAfterNavigation || copilotExpanded) return
    setActiveView('copilot'); setPanelOpen(true)
    setCopilotDisplayMode('addon'); consumeOpenAiPanelAfterNavigation()
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
    setActiveView(view); setPanelOpen(true)
  }

  function expandPanel() {
    if (activeView === 'copilot') {
      const params = new URLSearchParams()
      if (activeSessionId) params.set('session', activeSessionId)
      if (!copilotExpanded) params.set('from', currentPath)
      setCopilotDisplayMode('expanded'); setPanelOpen(false)
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

      {/* Right icon strip */}
      <aside
        className="flex h-full w-[44px] shrink-0 flex-col items-center border-l border-nav-divider bg-nav"
        aria-label="Quick actions"
      >
        <div className="flex w-full flex-col items-center gap-0.5 px-1 pt-2.5">
          <ShellIconActionButton
            title={panelOpen ? 'Close panel' : 'Open panel'}
            icon={PanelRight}
            active={panelOpen}
            onClick={() => setPanelOpen((open: boolean) => !open)}
          />
          <ShellDivider className="my-2 w-7" />
          {utilityActions.map(action => (
            <ShellIconActionButton
              key={action.id}
              title={action.id === conflictingAddon ? `${action.title} already open` : action.title}
              icon={action.icon}
              active={(panelOpen && activeView === action.id) || (action.id === 'copilot' && copilotExpanded)}
              disabled={action.id === conflictingAddon}
              onClick={() => openView(action.id)}
            />
          ))}
          <ShellDivider className="my-2 w-7" />
          <ShellIconActionButton
            title="Add panel"
            icon={Plus}
            active={panelOpen && activeView === 'add'}
            onClick={() => openView('add')}
          />
        </div>
      </aside>
    </>
  )
}
