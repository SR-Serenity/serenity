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
import { SidebarLayout } from '@/app/(workspace)/components/sidebar-layout'
import { WorkspaceSidebar } from '@/app/(workspace)/components/workspace-sidebar'

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

export default function OrgWorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isAuthenticated) return

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
      userInitials={auth.user?.displayName?.[0]?.toUpperCase() ?? 'M'}
    >
      {children}
    </SidebarLayout>
  )
}
