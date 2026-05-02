'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import {
  Calendar,
  LayoutDashboard,
  Loader2,
  Mail,
  MessageSquare,
  ListTodo,
  SquareKanban,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { SidebarLayout } from '@/components/layouts/sidebar-layout'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'

type WorkspaceLayoutProps = {
  children: ReactNode
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: 'dashboard' },
  { icon: MessageSquare, label: 'Chat', href: 'chat' },
  { icon: ListTodo, label: 'Tasks', href: 'tasks' },
  { icon: Calendar, label: 'Calendar', href: 'calendar' },
  { icon: SquareKanban, label: 'Workspace', href: 'workspace' },
  { icon: Mail, label: 'Email', href: 'mail' },
]

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function OrgWorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()

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
      <div className="flex items-center justify-center min-h-screen bg-sidebar">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const basePath = `/${orgSlug}`
  const displayName = auth.user?.displayName ?? 'Member'
  const initials = getInitials(displayName)

  const sidebar = (
    <WorkspaceSidebar
      basePath={basePath}
      currentPath={pathname}
      navItems={navItems}
      orgName={auth.currentOrg.name}
    />
  )

  return (
    <SidebarLayout
      sidebar={sidebar}
      userDisplayName={displayName}
      userInitials={initials}
    >
      {children}
    </SidebarLayout>
  )
}
