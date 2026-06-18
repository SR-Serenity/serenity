'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import Link from 'next/link'
import type { ChatConversation } from '@serenity/api'
import {
  Bot,
  Building2,
  Calendar,
  CheckSquare,
  ChevronRight,
  Clock,
  FileText,
  Hash,
  Layers,
  Loader2,
  Lock,
  Mail,
  Maximize2,
  MessageSquare,
  Plus,
  Search,
  UserSquare,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { WikiSubnav } from '@/app/(workspace)/[orgSlug]/wiki/components/wiki-subnav'
import { useChatStore } from '@/stores/chat-store'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { WorkspaceHeader } from '@/app/(workspace)/components/workspace-shell/workspace-header'
import { ShellDivider, ShellIconActionButton, ShellSectionHeader } from '@/app/(workspace)/components/workspace-shell/workspace-shell-primitives'
import {
  WorkspaceRail,
  type WorkspaceRailItem,
} from '@/app/(workspace)/components/workspace-shell/workspace-rail'
import { AiChatPanel } from '@/app/(workspace)/components/workspace-shell/ai-agent-panel'
import { DiceBearAvatar } from '@/components/dicebear-avatar'

type WorkspaceLayoutProps = {
  children: ReactNode
  params: {
    orgSlug?: string
  }
}

interface NavItem {
  id: string
  label: string
  href: string
  icon?: LucideIcon
  avatarSeed?: string
  avatarName?: string
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
    { id: 'planner',    icon: Calendar,      label: 'Planner',    href: `${basePath}/calendar`,   group: 'Work' },
    { id: 'tasks',      icon: CheckSquare,   label: 'Tasks',      href: `${basePath}/tasks`,      group: 'Work' },
    { id: 'mail',       icon: Mail,          label: 'Mail',       href: `${basePath}/mail`,       group: 'Communicate' },
    { id: 'chat',       icon: MessageSquare, label: 'Chat',       href: `${basePath}/chat`,       group: 'Communicate' },
    { id: 'wiki',       icon: FileText,      label: 'Wiki',       href: `${basePath}/wiki`,       group: 'Knowledge' },
    { id: 'contact',    icon: UserSquare,    label: 'Contacts',   href: `${basePath}/contact`,    group: 'People' },
    { id: 'office',     icon: Building2,     label: 'Office',     href: `${basePath}/office`,     group: 'People' },
    { id: 'automation', icon: Zap,           label: 'Automation', href: `${basePath}/automation`, group: 'Tools' },
  ]
}

function getChatConversationName(conversation: ChatConversation, currentUserId?: string) {
  if (conversation.name) return conversation.name
  return conversation.members
    .filter(member => member.userId !== currentUserId)
    .map(member => member.user.displayName)
    .join(', ') || 'You'
}

function getChatConversationAvatarUser(conversation: ChatConversation, currentUserId?: string) {
  return conversation.members.find(member => member.userId !== currentUserId)?.user
    ?? conversation.members[0]?.user
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
          items: directMessages.map(conversation => {
            const label = getChatConversationName(conversation, currentUserId)
            const avatarUser = getChatConversationAvatarUser(conversation, currentUserId)

            return {
              id: conversation.id,
              label,
              href: `${basePath}/chat/${encodeURIComponent(conversation.id)}`,
              avatarSeed: avatarUser?.id ?? conversation.id,
              avatarName: avatarUser?.displayName ?? label,
            }
          }),
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
    <div className="relative flex h-full w-full min-w-0 flex-col bg-nav">
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
    <div className="relative flex h-full w-full min-w-0 flex-col bg-nav">
      <div className="flex h-full w-full min-w-0 min-h-0 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between px-4">
          <h2 className="text-sm font-semibold text-primary-text">Calendar</h2>
          <Link
            href={`${basePath}/calendar?create=meeting`}
            title="Create meeting"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-ui hover:text-caption"
          >
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>
        <ShellDivider />

        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-2.5 py-2">
          <div className="space-y-4">
            <div>
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-tertiary-text">Create</div>
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?create=meeting`} icon={Plus} label="New meeting" />
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?create=event`} icon={Calendar} label="New event" />
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?create=task`} icon={CheckSquare} label="New task" />
            </div>

            <div>
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-tertiary-text">Scheduling</div>
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar`} icon={Calendar} label="All calendar items" />
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?type=EVENT`} icon={Calendar} label="Events" />
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?type=MEETING`} icon={Users} label="Meetings" />
              <PlannerSubnavLink currentPath={currentPath} href={`${basePath}/calendar?type=TASK`} icon={CheckSquare} label="Tasks" />
            </div>

            <div>
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-tertiary-text">Calendars</div>
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
        'mb-0.5 flex h-7 items-center gap-2 rounded-md px-2 text-[13px] transition-all',
        active ? 'bg-accent/10 font-medium text-accent-txt' : 'text-content hover:bg-ui hover:text-caption',
      )}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-accent-txt' : 'text-muted')} />
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
    <div className="relative flex h-full w-full min-w-0 flex-col border-r border-gray-200 bg-gray-50/50 text-gray-700">
      <div className="flex h-full w-full min-w-0 min-h-0 flex-col">
        <div className="shrink-0 border-b border-gray-200 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
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

        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2 no-scrollbar">
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
              avatarSeed: getChatConversationAvatarUser(conversation, currentUserId)?.id ?? conversation.id,
              avatarName: getChatConversationAvatarUser(conversation, currentUserId)?.displayName ?? getChatConversationName(conversation, currentUserId),
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
                avatarSeed={item.avatarSeed}
                avatarName={item.avatarName}
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
  avatarSeed,
  avatarName,
}: {
  href: string
  currentPath: string
  label: string
  icon?: LucideIcon
  avatarSeed?: string
  avatarName?: string
}) {
  const active = currentPath.split('?')[0] === href

  return (
    <Link
      href={href}
      className={cn(
        'flex h-7 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700',
        active && 'bg-white text-primary shadow-sm ring-1 ring-black/5 hover:bg-white hover:text-primary',
      )}
    >
      {avatarSeed ? (
        <DiceBearAvatar
          seed={avatarSeed}
          name={avatarName ?? label}
          className="h-5 w-5 rounded-md"
        />
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
          'group mx-2.5 mt-1.5 flex h-7 w-auto shrink-0 cursor-pointer items-center justify-between rounded-md border-none bg-transparent px-1.5 outline-none',
          'transition-colors duration-150 hover:bg-transparent',
          'focus-visible:bg-primary/10 focus-visible:text-accent-txt',
        )}
      >
        <div className="flex min-w-0 items-center gap-1">
          <span
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded text-tertiary-text',
              'transition-colors duration-100 group-hover:text-primary-text',
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
              'inline-flex min-w-0 items-center rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-tertiary-text',
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
          <div className="h-2" />
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
          'mx-2.5 flex h-7 min-h-7 min-w-0 shrink-0 cursor-pointer select-none items-center rounded-md px-2',
          'transition-colors duration-150',
          isActive ? 'bg-accent/10' : 'hover:bg-ui',
          depth > 0 && 'pl-8',
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
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [location, setLocation] = useState({ pathname: '', search: '' })

  useEffect(() => {
    const syncLocation = () => {
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
      })
    }

    syncLocation()

    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function pushState(...args) {
      const result = originalPushState.apply(this, args as Parameters<History['pushState']>)
      syncLocation()
      return result
    }

    window.history.replaceState = function replaceState(...args) {
      const result = originalReplaceState.apply(this, args as Parameters<History['replaceState']>)
      syncLocation()
      return result
    }

    window.addEventListener('popstate', syncLocation)

    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      window.removeEventListener('popstate', syncLocation)
    }
  }, [])

  const pathname = location.pathname
  const searchParams = new URLSearchParams(location.search)

  useEffect(() => {
    if (auth.initializing) return
    if (!auth.isAuthenticated) {
      window.location.replace('/login')
      return
    }
    if (orgSlug && auth.currentOrg?.slug !== orgSlug) {
      auth.selectOrg(orgSlug).catch(() => window.location.replace('/login'))
    }
  }, [
    auth.currentOrg?.slug,
    auth.initializing,
    auth.isAuthenticated,
    auth.selectOrg,
    orgSlug,
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
      <div className="flex min-h-screen items-center justify-center bg-nav">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
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
  const availableOrganizations = organizations.length > 0 ? organizations : [auth.currentOrg]

  async function handleSwitchOrg(nextOrgSlug: string) {
    if (nextOrgSlug === orgSlug) return
    setSwitchingOrgSlug(nextOrgSlug)
    try {
      await auth.selectOrg(nextOrgSlug)
      window.location.replace(`/${nextOrgSlug}/dashboard`)
    } finally {
      setSwitchingOrgSlug(null)
    }
  }

  function handleLogout() {
    auth.logout()
    window.location.replace('/login')
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface">
      {/* ── Left sidebar (full height) ── */}
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
      />

      {/* ── Center column: header + subnav + content ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <WorkspaceHeader
          orgSlug={orgSlug}
          activeApp={activeApp ? {
            id: activeApp.id,
            label: activeApp.label,
            icon: activeApp.icon,
            href: activeApp.href,
          } : undefined}
          hasSubnav={sections.length > 0}
          navigatorVisible={navigatorVisible}
          onToggleNavigator={() => setNavigatorVisible(v => !v)}
          copilotOpen={copilotOpen}
          onToggleCopilot={() => setCopilotOpen(v => !v)}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* ── Subnav panel (app-specific) ── */}
          {sections.length > 0 && (
            <div
              aria-hidden={!navigatorVisible}
              className={cn(
                'h-full shrink-0 overflow-hidden border-r border-divider/60 bg-nav',
                'transition-[width] duration-200 ease-out',
                navigatorVisible ? 'w-[210px]' : 'w-0 pointer-events-none',
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
                <PlannerSubnav basePath={basePath} currentPath={currentPath} />
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

          {/* ── Main content ── */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-panel">
            <main className="min-h-0 flex-1 overflow-hidden">
              <div className="h-full w-full overflow-y-auto no-scrollbar">
                {children}
              </div>
            </main>
          </div>

          {/* ── Copilot panel ── */}
          {copilotOpen && (
            <aside className="flex h-full w-[420px] shrink-0 flex-col overflow-hidden border-l border-blue-100/60 bg-[#f8faff]">
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-blue-100/60 px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Bot className="h-4 w-4 shrink-0 text-blue-500" />
                  <h2 className="truncate text-[13px] font-semibold text-primary-text">Copilot</h2>
                </div>
                <div className="flex items-center gap-0.5">
                  <ShellIconActionButton
                    title="Expand"
                    icon={Maximize2}
                    onClick={() => {
                      setCopilotOpen(false)
                      window.location.assign(`${basePath}/copilot`)
                    }}
                  />
                  <ShellIconActionButton title="Close" icon={X} onClick={() => setCopilotOpen(false)} />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
                <AiChatPanel compact={true} />
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
