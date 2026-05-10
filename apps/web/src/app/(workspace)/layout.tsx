'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { authApi, chatApi, type ChatConversation, type OrgSummary } from '@serenity/api'
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
  Hash,
  HardDrive,
  Inbox,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  TestTube,
  UserSquare,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { WorkspaceHeader } from '@/app/(workspace)/components/workspace-shell/workspace-header'
import { ShellDivider, ShellSectionHeader } from '@/app/(workspace)/components/workspace-shell/workspace-shell-primitives'
import {
  WorkspaceRail,
  WorkspaceUtilityRail,
  type WorkspaceRailItem,
} from '@/app/(workspace)/components/workspace-shell/workspace-rail'

type WorkspaceLayoutProps = { children: ReactNode }

interface NavItem {
  id: string
  label: string
  href: string
  icon?: LucideIcon
  count?: number
  children?: NavItem[]
}

interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

function buildApps(basePath: string): WorkspaceRailItem[] {
  return [
    {
      id: 'inbox',
      icon: Inbox,
      label: 'Inbox',
      href: `${basePath}/inbox`,
      position: 'top',
    },
    { id: 'planner', icon: Calendar, label: 'Planner', href: `${basePath}/calendar` },
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

function getChatConversationName(conversation: ChatConversation, currentUserId?: string) {
  if (conversation.name) return conversation.name
  return conversation.members
    .filter(member => member.userId !== currentUserId)
    .map(member => member.user.displayName)
    .join(', ') || 'You'
}

function buildSections(
  appId: string | undefined,
  basePath: string,
  chatConversations: ChatConversation[],
  currentUserId?: string,
): NavSection[] {
  switch (appId) {
    case 'chat': {
      if (chatConversations.length === 0) {
        return [
          {
            id: 'conversations',
            label: 'Conversations',
            items: [
              { id: 'all', label: 'All Messages', href: `${basePath}/chat`, icon: MessageSquare },
            ],
          },
        ]
      }

      const channels = chatConversations.filter(conversation => conversation.type !== 'DM')
      const directMessages = chatConversations.filter(conversation => conversation.type === 'DM')

      return [
        {
          id: 'channels',
          label: 'Channels',
          items: channels.map(conversation => ({
            id: conversation.id,
            label: getChatConversationName(conversation, currentUserId),
            href: `${basePath}/chat?conversation=${encodeURIComponent(conversation.id)}`,
            icon: conversation.type === 'PRIVATE_CHANNEL' ? Lock : Hash,
          })),
        },
        {
          id: 'direct-messages',
          label: 'Direct Messages',
          items: directMessages.map(conversation => ({
            id: conversation.id,
            label: getChatConversationName(conversation, currentUserId),
            href: `${basePath}/chat?conversation=${encodeURIComponent(conversation.id)}`,
            icon: MessageSquare,
          })),
        },
      ]
    }
    case 'inbox':
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
      ]
    case 'planner':
      return [
        {
          id: 'planner',
          label: 'Planner',
          items: [
            { id: 'calendar', label: 'Calendar', href: `${basePath}/calendar`, icon: Calendar },
            { id: 'tasks', label: 'Tasks', href: `${basePath}/tasks`, icon: CheckSquare },
            { id: 'later', label: 'Later', href: `${basePath}/tasks/later`, icon: Clock },
          ],
        },
      ]
    case 'office':
      return [
        {
          id: 'office',
          label: 'Office',
          items: [
            { id: 'overview', label: 'Overview', href: `${basePath}/workspace`, icon: Building2 },
            { id: 'team', label: 'Team', href: `${basePath}/team`, icon: Users },
            { id: 'documents', label: 'Documents', href: `${basePath}/documents`, icon: FileText },
          ],
        },
      ]
    case 'cards':
      return [
        {
          id: 'cards',
          label: 'Cards',
          items: [
            { id: 'all', label: 'All Cards', href: `${basePath}/cards`, icon: Layers },
            { id: 'starred', label: 'Starred', href: `${basePath}/cards/starred`, icon: Star },
          ],
        },
      ]
    case 'contact':
      return [
        {
          id: 'contact',
          label: 'Contact',
          items: [
            { id: 'people', label: 'People', href: `${basePath}/contact`, icon: UserSquare },
            { id: 'teams', label: 'Teams', href: `${basePath}/team`, icon: Users },
          ],
        },
      ]
    case 'hr':
      return [
        {
          id: 'hr',
          label: 'HR',
          items: [
            { id: 'people', label: 'People', href: `${basePath}/hr`, icon: Briefcase },
            { id: 'requests', label: 'Requests', href: `${basePath}/hr/requests`, icon: Inbox },
          ],
        },
      ]
    case 'trackers':
      return [
        {
          id: 'trackers',
          label: 'Trackers',
          items: [
            { id: 'all', label: 'All Trackers', href: `${basePath}/trackers`, icon: CheckSquare },
            { id: 'done', label: 'Done', href: `${basePath}/trackers/done`, icon: CheckCircle2 },
          ],
        },
      ]
    case 'documents':
      return [
        {
          id: 'documents',
          label: 'Documents',
          items: [
            { id: 'all', label: 'All Documents', href: `${basePath}/documents`, icon: FileText },
            { id: 'shared', label: 'Shared', href: `${basePath}/documents/shared`, icon: Users },
          ],
        },
      ]
    case 'team':
      return [
        {
          id: 'team',
          label: 'Team',
          items: [
            { id: 'members', label: 'Members', href: `${basePath}/team`, icon: Users },
            { id: 'groups', label: 'Groups', href: `${basePath}/team/groups`, icon: UserSquare },
          ],
        },
      ]
    case 'processes':
      return [
        {
          id: 'processes',
          label: 'Processes',
          items: [
            { id: 'all', label: 'All Processes', href: `${basePath}/processes`, icon: GitMerge },
            { id: 'handoffs', label: 'Handoffs', href: `${basePath}/processes/handoffs`, icon: Sparkles },
          ],
        },
      ]
    case 'drive':
      return [
        {
          id: 'drive',
          label: 'Drive',
          items: [
            { id: 'files', label: 'Files', href: `${basePath}/drive`, icon: HardDrive },
            { id: 'shared', label: 'Shared', href: `${basePath}/drive/shared`, icon: Users },
          ],
        },
      ]
    case 'test-management':
      return [
        {
          id: 'test-management',
          label: 'Test Management',
          items: [
            { id: 'tests', label: 'Tests', href: `${basePath}/test-management`, icon: TestTube },
            { id: 'runs', label: 'Runs', href: `${basePath}/test-management/runs`, icon: CheckCircle2 },
          ],
        },
      ]
    default:
      return []
  }
}

function ModuleSubnav({
  title,
  sections,
  currentPath,
}: {
  title: string
  sections: NavSection[]
  currentPath: string
}) {
  return (
    <div className="relative flex h-full w-70 min-w-50 max-w-90 flex-col bg-nav">
      <div className="flex h-full w-full min-w-0 min-h-0 flex-col">
        <ShellSectionHeader title={title} />

        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
          <ShellDivider />

          {sections.map(section => (
            <NavGroup key={section.id} section={section} currentPath={currentPath} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChatSubnav({
  basePath,
  conversations,
  currentPath,
  currentUserId,
  search,
  onSearchChange,
}: {
  basePath: string
  conversations: ChatConversation[]
  currentPath: string
  currentUserId?: string
  search: string
  onSearchChange: (value: string) => void
}) {
  const query = search.trim().toLowerCase()
  const filteredConversations = query
    ? conversations.filter(conversation =>
        getChatConversationName(conversation, currentUserId).toLowerCase().includes(query) ||
        conversation.members.some(member => member.user.displayName.toLowerCase().includes(query)),
      )
    : conversations

  const channels = filteredConversations.filter(conversation => conversation.type !== 'DM')
  const directMessages = filteredConversations.filter(conversation => conversation.type === 'DM')

  return (
    <div className="relative flex h-full w-70 min-w-50 max-w-90 flex-col bg-nav text-content">
      <div className="flex h-full w-full min-w-0 min-h-0 flex-col">
        <div className="shrink-0 border-b border-nav-divider px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              className="flex min-w-0 items-center gap-2 px-1 py-1 text-left text-sm font-semibold text-primary-text"
            >
              <span className="truncate">Serenity</span>
              <ChevronRight className="h-3.5 w-3.5 rotate-90 text-muted" />
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <Link
                href={`${basePath}/chat?new=dm`}
                title="New direct message"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-accent-txt"
              >
                <MessageSquare className="h-4 w-4" />
              </Link>
              <Link
                href={`${basePath}/chat?new=channel`}
                title="Create channel"
                className="flex h-7 w-7 items-center justify-center text-muted"
              >
                <Plus className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={event => onSearchChange(event.target.value)}
              placeholder="Search"
              className="h-9 w-full rounded-md border border-nav-divider bg-surface px-3 pl-9 text-sm text-content outline-none placeholder:text-muted"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 no-scrollbar">
          <ChatSubnavLink
            href={`${basePath}/chat`}
            currentPath={currentPath}
            label="All unread"
            icon={MessageSquare}
          />

          <div className="my-3 h-px bg-nav-divider" />

          <ChatSubnavSection
            title="Channels"
            actionHref={`${basePath}/chat?new=channel`}
            items={channels.map(conversation => ({
              id: conversation.id,
              label: getChatConversationName(conversation, currentUserId),
              href: `${basePath}/chat?conversation=${encodeURIComponent(conversation.id)}`,
              icon: conversation.type === 'PRIVATE_CHANNEL' ? Lock : Hash,
            }))}
            currentPath={currentPath}
          />

          <ChatSubnavSection
            title="Direct Messages"
            actionHref={`${basePath}/chat?new=dm`}
            items={directMessages.map(conversation => ({
              id: conversation.id,
              label: getChatConversationName(conversation, currentUserId),
              href: `${basePath}/chat?conversation=${encodeURIComponent(conversation.id)}`,
              icon: MessageSquare,
            }))}
            currentPath={currentPath}
          />
        </div>
      </div>
    </div>
  )
}

function ChatSubnavSection({
  title,
  actionHref,
  items,
  currentPath,
}: {
  title: string
  actionHref: string
  items: NavItem[]
  currentPath: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="mb-4">
      <div className="mb-1 flex h-8 items-center justify-between px-2">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
        className="flex min-w-0 items-center gap-2 text-sm text-tertiary-text"
        >
          <ChevronRight className={cn('h-3.5 w-3.5', open && 'rotate-90')} />
          <span className="truncate">{title}</span>
        </button>
        <Link href={actionHref} title={`Add ${title}`} className="text-muted">
          <Plus className="h-4 w-4" />
        </Link>
      </div>

      {open && (
        <div>
          {items.length === 0 ? (
            <div className="px-7 py-1 text-sm text-disabled-text">No items</div>
          ) : (
            items.map(item => (
              <ChatSubnavLink
                key={item.id}
                href={item.href}
                currentPath={currentPath}
                label={item.label}
                icon={item.icon}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ChatSubnavLink({
  href,
  currentPath,
  label,
  icon: Icon,
}: {
  href: string
  currentPath: string
  label: string
  icon?: LucideIcon
}) {
  const active = currentPath === href

  return (
    <Link
      href={href}
      className={cn(
        'flex h-8 items-center gap-2 rounded px-3 text-sm text-content',
        active && 'bg-primary/10 text-primary-text',
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{label}</span>
    </Link>
  )
}

function NavGroup({
  section,
  currentPath,
}: {
  section: NavSection
  currentPath: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="flex w-full min-w-0 min-h-0 shrink-0 flex-col">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className={cn(
          'group mx-3 flex min-h-10 w-auto shrink-0 cursor-pointer items-center justify-between rounded-xl border-none bg-transparent px-2 py-2 outline-none',
          'transition-colors duration-150 hover:bg-nav-hover',
          'focus-visible:bg-primary/10 focus-visible:text-accent-txt',
        )}
      >
        <div className="flex min-w-0 items-center gap-1">
          <span
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-transparent text-disabled-text',
              'transition-all duration-100 group-hover:bg-ui group-hover:text-subtle-label',
            )}
          >
            <ChevronRight
              className={cn(
                'h-3 w-3 transition-transform duration-100',
                open ? 'rotate-90' : 'rotate-0',
              )}
            />
          </span>

          <span
            className={cn(
              'inline-flex min-w-0 items-center rounded-lg px-1 py-0.5 text-xs font-medium uppercase tracking-[0.08em] text-tertiary-text',
              'transition-colors duration-150 group-hover:bg-ui-hover group-hover:text-primary-text',
            )}
          >
            {section.label}
          </span>
        </div>
      </button>

      {open && (
        <div className="flex min-w-0 flex-col overflow-hidden">
          {section.items.map(item => (
            <NavItemRow
              key={item.id}
              item={item}
              currentPath={currentPath}
              depth={0}
            />
          ))}
          <div className="h-3" />
        </div>
      )}
    </div>
  )
}

function NavItemRow({
  item,
  currentPath,
  depth,
}: {
  item: NavItem
  currentPath: string
  depth: number
}) {
  const [open, setOpen] = useState(false)
  const hasChildren = !!item.children?.length
  const itemPath = item.href.split('?')[0]
  const isActive = currentPath === item.href || (!item.href.includes('?') && currentPath.startsWith(itemPath + '/'))
  const Icon = item.icon

  return (
    <>
      <div
        className={cn(
          'mx-3 flex h-9 min-h-9 min-w-0 shrink-0 cursor-pointer select-none items-center rounded-xl px-3',
          'transition-colors duration-150',
          isActive ? 'bg-primary/10' : 'hover:bg-nav-hover',
          depth > 0 && 'pl-10',
        )}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen(value => !value)}
            className={cn(
              'mr-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-lg text-trans outline-none',
              'transition-colors duration-150 hover:bg-btn-hover hover:text-caption',
            )}
          >
            <ChevronRight
              className={cn(
                'h-3 w-3 transition-transform duration-100',
                open ? 'rotate-90' : 'rotate-0',
              )}
            />
          </button>
        )}

        {Icon && (
          <span
            className={cn(
              'mr-2 h-4 w-4 shrink-0 transition-colors duration-150',
              isActive ? 'text-accent-txt' : 'text-muted',
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}

        <Link
          href={item.href}
          className={cn(
            'min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm outline-none',
            'transition-colors duration-150',
            isActive ? 'font-medium text-primary-text' : 'text-content',
          )}
        >
          {item.label}
        </Link>

        {item.count != null && item.count > 0 && (
          <span className="ml-3 shrink-0 text-xs font-semibold text-content">
            {item.count}
          </span>
        )}
      </div>

      {hasChildren && open && (
        <div className="flex min-w-0 flex-col">
          {item.children?.map(child => (
            <NavItemRow
              key={child.id}
              item={child}
              currentPath={currentPath}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </>
  )
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { orgSlug } = useParams<{ orgSlug?: string }>()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const auth = useAuth()
  const [navigatorVisible, setNavigatorVisible] = useState(true)
  const [organizations, setOrganizations] = useState<OrgSummary[]>([])
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([])
  const [chatNavSearch, setChatNavSearch] = useState('')
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

  useEffect(() => {
    if (!auth.token || !orgSlug || !pathname.startsWith(`/${orgSlug}/chat`)) {
      setChatConversations([])
      return
    }

    let cancelled = false
    chatApi.listConversations(auth.token)
      .then(response => {
        if (!cancelled) {
          setChatConversations(response.conversations)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChatConversations([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [auth.token, orgSlug, pathname])

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
  const activeApp = apps.find(
    app => pathname === app.href || pathname.startsWith(app.href + '/'),
  )
  const sections = buildSections(activeApp?.id, basePath, chatConversations, auth.user?.id)
  const currentPath = searchParams.size > 0 ? `${pathname}?${searchParams.toString()}` : pathname
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
                {activeApp?.id === 'chat' ? (
                  <ChatSubnav
                    basePath={basePath}
                    conversations={chatConversations}
                    currentPath={currentPath}
                    currentUserId={auth.user?.id}
                    search={chatNavSearch}
                    onSearchChange={setChatNavSearch}
                  />
                ) : (
                  <ModuleSubnav
                    title={activeApp?.label ?? 'Workspace'}
                    sections={sections}
                    currentPath={currentPath}
                  />
                )}
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
