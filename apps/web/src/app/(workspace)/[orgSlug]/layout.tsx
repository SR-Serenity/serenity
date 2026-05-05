'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import {
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  FileText,
  GitMerge,
  HardDrive,
  Inbox,
  Layers,
  Loader2,
  MessageSquare,
  TestTube,
  UserSquare,
  Users,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { WorkbenchLayout } from '@/app/(workspace)/components/sidebar-layout'
import type { AppItem } from '@/app/(workspace)/components/app-dock'
import type { NavSection } from '@/app/(workspace)/components/nav-panel'

type WorkspaceLayoutProps = { children: ReactNode }

/** Canonical workspace apps shown in the left dock. */
function buildApps(basePath: string): AppItem[] {
  return [
    /* position: 'top' */
    {
      id: 'inbox',
      icon: Inbox,
      label: 'Inbox',
      href: `${basePath}/inbox`,
      position: 'top',
    },
    /* mid apps (core) */
    {
      id: 'planner',
      icon: Calendar,
      label: 'Planner',
      href: `${basePath}/planner`,
    },
    {
      id: 'office',
      icon: Building2,
      label: 'Office',
      href: `${basePath}/office`,
    },
    {
      id: 'cards',
      icon: Layers,
      label: 'Cards',
      href: `${basePath}/cards`,
    },
    {
      id: 'contact',
      icon: UserSquare,
      label: 'Contact',
      href: `${basePath}/contact`,
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Chat',
      href: `${basePath}/chat`,
    },
    {
      id: 'hr',
      icon: Briefcase,
      label: 'HR',
      href: `${basePath}/hr`,
    },
    {
      id: 'trackers',
      icon: CheckSquare,
      label: 'Trackers',
      href: `${basePath}/trackers`,
    },
    {
      id: 'documents',
      icon: FileText,
      label: 'Documents',
      href: `${basePath}/documents`,
    },
    {
      id: 'team',
      icon: Users,
      label: 'Team',
      href: `${basePath}/team`,
    },
    {
      id: 'processes',
      icon: GitMerge,
      label: 'Processes',
      href: `${basePath}/processes`,
    },
    {
      id: 'drive',
      icon: HardDrive,
      label: 'Drive',
      href: `${basePath}/drive`,
    },
    {
      id: 'test-management',
      icon: TestTube,
      label: 'Test Management',
      href: `${basePath}/test-management`,
    },
  ]
}

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
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: 'var(--theme-back-color)' }}
      >
        <Loader2
          className="w-6 h-6 animate-spin"
          style={{ color: 'var(--global-accent-BackgroundColor)' }}
        />
      </div>
    )
  }

  const basePath = `/${orgSlug}`
  const apps = buildApps(basePath)
  const sections: NavSection[] = [] // Removed submenu completely as requested

  return (
    <WorkbenchLayout
      apps={apps}
      sections={sections}
      currentPath={pathname}
    >
      {children}
    </WorkbenchLayout>
  )
}
