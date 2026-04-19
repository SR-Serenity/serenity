'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  Calendar,
  LayoutDashboard,
  ListTodo,
  Loader2,
  Mail,
  MessageSquareText,
  Search,
  SquareKanban,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { SidebarLayout } from '@/components/layouts/sidebar-layout'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'

type WorkspaceLayoutProps = {
  children: ReactNode
}

const navGroups = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: 'dashboard' },
      { icon: MessageSquareText, label: 'Inbox', href: 'inbox', badge: 3 },
      { icon: Bell, label: 'Notifications', href: 'notifications', badge: 12 },
    ],
  },
  {
    label: 'Work',
    items: [
      { icon: ListTodo, label: 'Tasks', href: 'tasks', badge: 5 },
      { icon: Calendar, label: 'Calendar', href: 'calendar' },
      { icon: SquareKanban, label: 'Workspace', href: 'workspace' },
    ],
  },
  {
    label: 'Connect',
    items: [
      { icon: Mail, label: 'Mail', href: 'mail' },
      { icon: Search, label: 'Search', href: 'search' },
    ],
  },
]

export default function OrgWorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const pathname = usePathname()
  const router = useRouter()
  // pathname is passed to sidebar for active-item highlighting
  const auth = useAuth()
  const [sidebarWidth, setSidebarWidth] = useState(288)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return
    }
    if (auth.currentOrg?.slug !== orgSlug) {
      auth.selectOrg(orgSlug).catch(() => router.replace('/login'))
    }
  }, [auth, orgSlug, router])

  if (!auth.isAuthenticated || !auth.currentOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    )
  }

  const basePath = `/${orgSlug}`

  function handleLogout() {
    auth.logout()
    router.push('/login')
  }

  async function handleSwitchOrganization() {
    const nextSlug = window.prompt('Enter organization slug')?.trim().toLowerCase()
    if (!nextSlug || nextSlug === orgSlug) {
      return
    }
    try {
      await auth.selectOrg(nextSlug)
      router.push(`/${nextSlug}/dashboard`)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to switch organization')
    }
  }

  const displayName = auth.user?.displayName ?? 'Member'

  const sidebar = (
    <WorkspaceSidebar
      orgId={auth.currentOrg.id}
      memberId={auth.currentOrg.memberId}
      orgName={auth.currentOrg.name}
      orgSlug={auth.currentOrg.slug}
      userDisplayName={displayName}
      userEmail={auth.user?.email ?? ''}
      sidebarCollapsed={sidebarCollapsed}
      basePath={basePath}
      currentPath={pathname}
      navGroups={navGroups}
      onProfile={() => router.push(`/${orgSlug}/profile`)}
      onSwitchOrg={handleSwitchOrganization}
      onSettings={() => router.push(`/${orgSlug}/settings`)}
      onLogout={handleLogout}
      onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
    />
  )

  return (
    <SidebarLayout
      sidebar={sidebar}
      sidebarWidth={sidebarWidth}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarWidthChange={setSidebarWidth}
    >
      {children}
    </SidebarLayout>
  )
}
