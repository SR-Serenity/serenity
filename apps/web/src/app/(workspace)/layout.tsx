'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { authApi, type OrgSummary } from '@serenity/api'
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  GitMerge,
  HardDrive,
  Inbox,
  Layers,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Star,
  Tag,
  TestTube,
  UserSquare,
  Users,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { WorkspaceHeader } from '@/app/(workspace)/components/workspace-shell/workspace-header'
import {
  WorkspaceRail,
  WorkspaceUtilityRail,
  type WorkspaceRailItem,
} from '@/app/(workspace)/components/workspace-shell/workspace-rail'
import { WorkspaceSubnav, type NavSection } from '@/app/(workspace)/components/workspace-shell/workspace-subnav'

type WorkspaceLayoutProps = { children: ReactNode }

function buildApps(basePath: string): WorkspaceRailItem[] {
  return [
    {
      id: 'inbox',
      icon: Inbox,
      label: 'Inbox',
      href: `${basePath}/inbox`,
      position: 'top',
    },
    { id: 'planner', icon: Calendar, label: 'Planner', href: `${basePath}/planner` },
    { id: 'office', icon: Building2, label: 'Office', href: `${basePath}/office` },
    { id: 'cards', icon: Layers, label: 'Cards', href: `${basePath}/cards` },
    { id: 'contact', icon: UserSquare, label: 'Contact', href: `${basePath}/contact` },
    { id: 'chat', icon: MessageSquare, label: 'Chat', href: `${basePath}/chat` },
    { id: 'hr', icon: Briefcase, label: 'HR', href: `${basePath}/hr` },
    { id: 'trackers', icon: CheckSquare, label: 'Trackers', href: `${basePath}/trackers` },
    { id: 'documents', icon: FileText, label: 'Documents', href: `${basePath}/documents` },
    { id: 'team', icon: Users, label: 'Team', href: `${basePath}/team` },
    { id: 'processes', icon: GitMerge, label: 'Processes', href: `${basePath}/processes` },
    { id: 'drive', icon: HardDrive, label: 'Drive', href: `${basePath}/drive` },
    { id: 'test-management', icon: TestTube, label: 'Test Management', href: `${basePath}/test-management` },
  ]
}

function buildSections(basePath: string): NavSection[] {
  return [
    {
      id: 'inbox',
      label: 'Inbox',
      items: [
        { id: 'open', label: 'Open', href: `${basePath}/inbox`, icon: Inbox, count: 8 },
        { id: 'priority', label: 'Priority', href: `${basePath}/inbox/priority`, icon: Star, count: 3 },
        { id: 'later', label: 'Later', href: `${basePath}/tasks`, icon: Clock },
        { id: 'sent', label: 'Sent', href: `${basePath}/mail`, icon: Send },
        { id: 'done', label: 'Done', href: `${basePath}/inbox/done`, icon: CheckCircle2 },
      ],
    },
    {
      id: 'shared',
      label: 'Shared',
      items: [
        {
          id: 'product',
          label: 'Product',
          href: `${basePath}/workspace/product`,
          icon: Tag,
          children: [
            { id: 'roadmap', label: 'Roadmap', href: `${basePath}/workspace/product/roadmap` },
            { id: 'feedback', label: 'Feedback', href: `${basePath}/workspace/product/feedback` },
          ],
        },
        {
          id: 'operations',
          label: 'Operations',
          href: `${basePath}/workspace/operations`,
          icon: Sparkles,
          children: [
            { id: 'handoffs', label: 'Handoffs', href: `${basePath}/workspace/operations/handoffs` },
            { id: 'weekly-review', label: 'Weekly review', href: `${basePath}/workspace/operations/weekly-review` },
          ],
        },
      ],
    },
  ]
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { orgSlug } = useParams<{ orgSlug?: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const [navigatorVisible, setNavigatorVisible] = useState(true)
  const [organizations, setOrganizations] = useState<OrgSummary[]>([])
  const [switchingOrgSlug, setSwitchingOrgSlug] = useState<string | null>(null)

  useEffect(() => {
    if (auth.initializing) return
    if (!auth.isAuthenticated) {
      router.replace('/login')
      return
    }
    if (orgSlug && auth.currentOrg?.slug !== orgSlug) {
      auth.selectOrg(orgSlug).catch(() => router.replace('/login'))
    }
  }, [auth, orgSlug, router])

  useEffect(() => {
    if (!auth.token || !auth.currentOrg) {
      setOrganizations([])
      return
    }

    let cancelled = false
    authApi.organizations(auth.token)
      .then(response => {
        if (!cancelled) {
          setOrganizations(response.organizations)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrganizations([auth.currentOrg as OrgSummary])
        }
      })

    return () => {
      cancelled = true
    }
  }, [auth.token, auth.currentOrg])

  if (auth.initializing || !auth.isAuthenticated || !orgSlug || !auth.currentOrg) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: 'var(--theme-back-color)' }}
      >
        <Loader2
          className="h-6 w-6 animate-spin"
          style={{ color: 'var(--global-accent-BackgroundColor)' }}
        />
      </div>
    )
  }

  const basePath = `/${orgSlug}`
  const apps = buildApps(basePath)
  const sections = buildSections(basePath)
  const activeApp = apps.find(
    app => pathname === app.href || pathname.startsWith(app.href + '/'),
  )
  const userInitials = (auth.user?.displayName ?? auth.user?.email ?? 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((word: string) => word[0]?.toUpperCase() ?? '')
    .join('')
  const availableOrganizations = organizations.length > 0 ? organizations : [auth.currentOrg]

  async function handleSwitchOrg(nextOrgSlug: string) {
    if (nextOrgSlug === orgSlug) return
    setSwitchingOrgSlug(nextOrgSlug)
    try {
      await auth.selectOrg(nextOrgSlug)
      router.replace(`/${nextOrgSlug}/dashboard`)
    } finally {
      setSwitchingOrgSlug(null)
    }
  }

  function handleLogout() {
    auth.logout()
    router.replace('/login')
  }

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-back">
      <WorkspaceHeader
        currentPath={pathname}
        orgSlug={orgSlug}
        activeApp={activeApp ? { label: activeApp.label, icon: activeApp.icon } : undefined}
      />

      <div className="flex min-h-0 w-full flex-1 gap-2 overflow-hidden bg-back p-2">
        <div
          className={cn(
            'group/nav relative h-full min-h-0 shrink-0 overflow-visible',
            'transition-[width] duration-200 ease-out',
            navigatorVisible && sections.length > 0 ? 'w-[348px]' : 'w-17',
          )}
        >
          <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-nav-divider bg-nav">
            <WorkspaceRail
              orgSlug={orgSlug}
              apps={apps}
              currentPath={pathname}
              navigatorVisible={navigatorVisible}
              user={auth.user}
              currentOrg={auth.currentOrg}
              organizations={availableOrganizations}
              switchingOrgSlug={switchingOrgSlug}
              onSwitchOrg={handleSwitchOrg}
              onLogout={handleLogout}
              userInitials={userInitials}
            />

            {sections.length > 0 && (
              <div
                aria-hidden={!navigatorVisible}
                className={cn(
                  'h-full min-h-0 overflow-hidden',
                  'transition-[width,opacity,transform] duration-200 ease-out',
                  navigatorVisible
                    ? 'w-70 translate-x-0 opacity-100'
                    : 'w-0 -translate-x-2 opacity-0 pointer-events-none',
                )}
              >
                <WorkspaceSubnav
                  title={activeApp?.label ?? 'Workspace'}
                  sections={sections}
                  currentPath={pathname}
                />
              </div>
            )}
          </div>

          {sections.length > 0 && (
            <button
              type="button"
              title={navigatorVisible ? 'Collapse menu' : 'Expand menu'}
              onClick={() => setNavigatorVisible(visible => !visible)}
              className={cn(
                'absolute right-0 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 translate-x-1/2 items-center justify-center',
                'rounded-full border border-nav-divider bg-panel text-muted shadow-sm outline-none',
                'opacity-0 transition-all duration-150 ease-out',
                'hover:bg-btn-hover hover:text-caption',
                'focus-visible:border-focus focus-visible:opacity-100',
                'group-hover/nav:opacity-100',
              )}
            >
              {navigatorVisible ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-divider bg-surface">
          <main className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full w-full overflow-y-auto no-scrollbar">
              {children}
            </div>
          </main>
        </div>

        <WorkspaceUtilityRail />
      </div>
    </div>
  )
}
