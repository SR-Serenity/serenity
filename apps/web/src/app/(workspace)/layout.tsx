'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ChatConversation } from '@serenity/api'
import {
  Building2,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Hash,
  Layers,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  Search,
  UserSquare,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { WikiSubnav } from '@/app/(workspace)/[orgSlug]/wiki/components/wiki-subnav'
import { useChatStore } from '@/stores/chat-store'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace-store'
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
  avatarLabel?: string
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
    { id: 'planner', icon: Calendar, label: 'Planner', href: `${basePath}/calendar` },
    { id: 'office', icon: Building2, label: 'Office', href: `${basePath}/office` },
    { id: 'contact', icon: UserSquare, label: 'Contact', href: `${basePath}/contact` },
    { id: 'mail', icon: Mail, label: 'Mail', href: `${basePath}/mail` },
    { id: 'chat', icon: MessageSquare, label: 'Chat', href: `${basePath}/chat` },
    { id: 'wiki', icon: FileText, label: 'Wiki', href: `${basePath}/wiki` },
  ]
}

function getChatConversationName(conversation: ChatConversation, currentUserId?: string) {
  if (conversation.name) return conversation.name
  return conversation.members
    .filter(member => member.userId !== currentUserId)
    .map(member => member.user.displayName)
    .join(', ') || 'You'
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'U'
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
            href: `${basePath}/chat/${encodeURIComponent(conversation.id)}`,
            icon: conversation.type === 'PRIVATE_CHANNEL' ? Lock : Hash,
          })),
        },
        {
          id: 'direct-messages',
          label: 'Direct Messages',
          items: directMessages.map(conversation => ({
            id: conversation.id,
            label: getChatConversationName(conversation, currentUserId),
            href: `${basePath}/chat/${encodeURIComponent(conversation.id)}`,
            avatarLabel: initials(getChatConversationName(conversation, currentUserId)),
          })),
        },
      ]
    }
    case 'planner':
      return [
        {
          id: 'create',
          label: 'Create',
          items: [
            { id: 'new-meeting', label: 'New meeting', href: `${basePath}/calendar?create=meeting`, icon: Plus },
            { id: 'new-event', label: 'New event', href: `${basePath}/calendar?create=event`, icon: Calendar },
            { id: 'new-task', label: 'New task', href: `${basePath}/calendar?create=task`, icon: CheckSquare },
          ],
        },
        {
          id: 'views',
          label: 'Planner',
          items: [
            { id: 'calendar', label: 'Calendar', href: `${basePath}/calendar`, icon: Calendar },
            { id: 'tasks', label: 'Tasks', href: `${basePath}/tasks`, icon: CheckSquare },
            { id: 'later', label: 'Later', href: `${basePath}/tasks/later`, icon: Clock },
          ],
        },
        {
          id: 'calendar-filter',
          label: 'Calendar filters',
          items: [
            { id: 'all-calendar-items', label: 'All items', href: `${basePath}/calendar`, icon: Layers },
            { id: 'events-only', label: 'Events', href: `${basePath}/calendar?type=EVENT`, icon: Calendar },
            { id: 'meetings-only', label: 'Meetings', href: `${basePath}/calendar?type=MEETING`, icon: Users },
            { id: 'tasks-only', label: 'Tasks', href: `${basePath}/calendar?type=TASK`, icon: CheckSquare },
          ],
        },
        {
          id: 'calendar-scope',
          label: 'Visibility',
          items: [
            { id: 'all-visibility', label: 'All calendars', href: `${basePath}/calendar`, icon: Calendar },
            { id: 'company-calendar', label: 'Company', href: `${basePath}/calendar?visibility=COMPANY`, icon: Building2 },
            { id: 'personal-calendar', label: 'Personal', href: `${basePath}/calendar?visibility=PERSONAL`, icon: UserSquare },
          ],
        },
      ]
    case 'office':
      return [
        {
          id: 'office',
          label: 'Office',
          items: [
            { id: 'floor', label: 'Floor', href: `${basePath}/office`, icon: Building2 },
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
          ],
        },
      ]
    case 'wiki':
      return [{ id: 'wiki', label: 'Wiki', items: [] }]
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

function PlannerSubnav({
  basePath,
  currentPath,
}: {
  basePath: string
  currentPath: string
}) {
  return (
    <div className="relative flex h-full w-70 min-w-50 max-w-90 flex-col bg-nav">
      <div className="flex h-full w-full min-w-0 min-h-0 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between px-5">
          <h2 className="text-base font-medium text-primary-text">Calendar</h2>
          <Link
            href={`${basePath}/calendar?create=meeting`}
            title="Create meeting"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ui hover:text-caption"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
        <ShellDivider />

        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-3 py-3">
          <div className="space-y-5">
            <div>
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-tertiary-text">Create</div>
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?create=meeting`} icon={Plus} label="New meeting" />
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?create=event`} icon={Calendar} label="New event" />
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?create=task`} icon={CheckSquare} label="New task" />
            </div>

            <div>
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-tertiary-text">Scheduling</div>
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar`} icon={Calendar} label="All calendar items" />
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?type=EVENT`} icon={Calendar} label="Events" />
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?type=MEETING`} icon={Users} label="Meetings" />
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?type=TASK`} icon={CheckSquare} label="Tasks" />
            </div>

            <div>
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-tertiary-text">Calendars</div>
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar`} icon={Calendar} label="All calendars" />
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?visibility=COMPANY`} icon={Building2} label="Company" />
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?visibility=PERSONAL`} icon={UserSquare} label="Personal" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlannerSubnavLink({
  href,
  currentPath,
  label,
  icon: Icon,
}: {
  href: string
  currentPath: string
  label: string
  icon: LucideIcon
}) {
  const currentPathOnly = currentPath.split('?')[0]
  const active = href.includes('?') ? currentPath === href : currentPathOnly === href

  return (
    <Link
      href={href}
      className={cn(
        'mb-1 flex h-8 items-center gap-2 rounded-lg px-2.5 text-sm transition-all',
        active ? 'bg-white font-medium text-primary-text shadow-sm ring-1 ring-black/5' : 'text-content hover:bg-ui hover:text-caption',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-accent-txt' : 'text-muted')} />
      <span className="truncate">{label}</span>
    </Link>
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
  const openDialog = (type: 'channel' | 'dm') => {
    window.dispatchEvent(new CustomEvent('serenity:open-chat-dialog', { detail: type }))
  }

  return (
    <div className="relative flex h-full w-70 min-w-50 max-w-90 flex-col border-r border-gray-200 bg-gray-50/50 text-gray-700">
      <div className="flex h-full w-full min-w-0 min-h-0 flex-col">
        <div className="shrink-0 border-b border-gray-200 px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              className="flex min-w-0 items-center gap-2 px-1 py-1 text-left text-sm font-semibold text-gray-900"
            >
              <span className="truncate">Serenity</span>
              <ChevronRight className="h-3.5 w-3.5 rotate-90 text-gray-400" />
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => openDialog('dm')}
                title="New direct message"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors hover:bg-blue-200"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => openDialog('channel')}
                title="Create channel"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={event => onSearchChange(event.target.value)}
              placeholder="Search"
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 pl-9 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

          <div className="my-3 h-px bg-gray-100" />

          <ChatSubnavSection
            title="Channels"
            onAction={() => openDialog('channel')}
            items={channels.map(conversation => ({
              id: conversation.id,
              label: getChatConversationName(conversation, currentUserId),
              href: `${basePath}/chat/${encodeURIComponent(conversation.id)}`,
              icon: conversation.type === 'PRIVATE_CHANNEL' ? Lock : Hash,
            }))}
            currentPath={currentPath}
          />

          <ChatSubnavSection
            title="Direct Messages"
            onAction={() => openDialog('dm')}
            items={directMessages.map(conversation => ({
              id: conversation.id,
              label: getChatConversationName(conversation, currentUserId),
              href: `${basePath}/chat/${encodeURIComponent(conversation.id)}`,
              avatarLabel: initials(getChatConversationName(conversation, currentUserId)),
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
  onAction,
  items,
  currentPath,
}: {
  title: string
  onAction: () => void
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
          className="flex min-w-0 items-center gap-2 text-sm font-medium text-gray-500"
        >
          <ChevronRight className={cn('h-3.5 w-3.5', open && 'rotate-90')} />
          <span className="truncate">{title}</span>
        </button>
        <button
          type="button"
          onClick={onAction}
          title={`Add ${title}`}
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div>
          {items.length === 0 ? (
            <div className="px-7 py-1 text-sm text-gray-400">No items</div>
          ) : (
            items.map(item => (
              <ChatSubnavLink
                key={item.id}
                href={item.href}
                currentPath={currentPath}
                label={item.label}
                icon={item.icon}
                avatarLabel={item.avatarLabel}
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
  avatarLabel,
}: {
  href: string
  currentPath: string
  label: string
  icon?: LucideIcon
  avatarLabel?: string
}) {
  const active = currentPath.split('?')[0] === href

  return (
    <Link
      href={href}
      className={cn(
        'flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700',
        active && 'bg-white text-primary shadow-sm ring-1 ring-black/5 hover:bg-white hover:text-primary',
      )}
    >
      {avatarLabel ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal-500 text-[10px] font-semibold text-white">
          {avatarLabel}
        </span>
      ) : Icon ? (
        <Icon className={cn('h-4 w-4 shrink-0 text-gray-400', active && 'text-primary')} />
      ) : null}
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
          'group mx-3 mt-2 flex h-8 w-auto shrink-0 cursor-pointer items-center justify-between rounded-lg border-none bg-transparent px-2 outline-none',
          'transition-colors duration-150 hover:bg-transparent',
          'focus-visible:bg-primary/10 focus-visible:text-accent-txt',
        )}
      >
        <div className="flex min-w-0 items-center gap-1">
          <span
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-transparent text-tertiary-text',
              'transition-colors duration-100 group-hover:bg-ui group-hover:text-primary-text',
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
              'inline-flex min-w-0 items-center rounded-md px-1.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-tertiary-text',
              'transition-colors duration-150 group-hover:text-primary-text',
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
  const currentPathOnly = currentPath.split('?')[0]
  const isActive = item.href.includes('?')
    ? currentPath === item.href
    : currentPathOnly === item.href || currentPathOnly.startsWith(itemPath + '/')
  const Icon = item.icon

  return (
    <>
      <div
        className={cn(
          'mx-3 flex h-8 min-h-8 min-w-0 shrink-0 cursor-pointer select-none items-center rounded-lg px-2.5',
          'transition-colors duration-150',
          isActive ? 'bg-primary/10' : 'hover:bg-ui',
          depth > 0 && 'pl-10',
        )}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen(value => !value)}
            className={cn(
              'mr-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md text-trans outline-none',
              'transition-colors duration-150 hover:bg-ui-hover hover:text-caption',
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
  const auth = useAuthStore(
    useShallow((state) => ({
      token: state.token,
      user: state.user,
      currentOrg: state.currentOrg,
      initializing: state.initializing,
      selectOrg: state.selectOrg,
      logout: state.logout,
      isAuthenticated: state.token !== null,
    })),
  )
  const navigatorVisible = useWorkspaceStore((state) => state.navigatorVisible)
  const setNavigatorVisible = useWorkspaceStore((state) => state.setNavigatorVisible)
  const organizations = useWorkspaceStore((state) => state.organizations)
  const loadOrganizations = useWorkspaceStore((state) => state.loadOrganizations)
  const chatNavSearch = useWorkspaceStore((state) => state.chatNavSearch)
  const setChatNavSearch = useWorkspaceStore((state) => state.setChatNavSearch)
  const switchingOrgSlug = useWorkspaceStore((state) => state.switchingOrgSlug)
  const setSwitchingOrgSlug = useWorkspaceStore((state) => state.setSwitchingOrgSlug)
  const chatConversations = useChatStore((state) => state.conversations)
  const loadChatConversations = useChatStore((state) => state.loadConversations)

  useEffect(() => {
    if (auth.initializing) return
    if (!auth.isAuthenticated) {
      router.replace('/login')
      return
    }
    if (orgSlug && auth.currentOrg?.slug !== orgSlug) {
      auth.selectOrg(orgSlug).catch(() => router.replace('/login'))
    }
  }, [
    auth.currentOrg?.slug,
    auth.initializing,
    auth.isAuthenticated,
    auth.selectOrg,
    orgSlug,
    router,
  ])

  useEffect(() => {
    void loadOrganizations(auth.token, auth.currentOrg)
  }, [auth.token, auth.currentOrg, loadOrganizations])

  useEffect(() => {
    const shouldLoadChat = Boolean(orgSlug && pathname.startsWith(`/${orgSlug}/chat`))
    void loadChatConversations(auth.token, shouldLoadChat)
  }, [auth.token, loadChatConversations, orgSlug, pathname])

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
  const currentQuery = searchParams.toString()
  const currentPath = currentQuery ? `${pathname}?${currentQuery}` : pathname
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
        activeApp={activeApp ? {
          id: activeApp.id,
          label: activeApp.label,
          icon: activeApp.icon,
          href: activeApp.href,
        } : undefined}
      />

      <div className="flex min-h-0 w-full flex-1 gap-2 overflow-hidden bg-back p-2">
        <div
          className={cn(
            'group/nav relative h-full min-h-0 shrink-0 overflow-visible',
            'transition-[width] duration-200 ease-out',
            navigatorVisible && sections.length > 0 ? 'w-87' : 'w-17',
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
                ) : activeApp?.id === 'planner' ? (
                  <PlannerSubnav
                    basePath={basePath}
                    currentPath={currentPath}
                  />
                ) : activeApp?.id === 'wiki' ? (
                  <WikiSubnav />
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

        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border',
            activeApp?.id === 'chat' ? 'border-gray-200 bg-white' : 'border-divider bg-surface',
          )}
        >
          <main className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full w-full overflow-y-auto no-scrollbar">
              {children}
            </div>
          </main>
        </div>

        <WorkspaceUtilityRail basePath={basePath} currentPath={currentPath} />
      </div>
    </div>
  )
}
