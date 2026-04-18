'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/use-auth'
import { SidebarLayout } from '@/components/layouts/sidebar-layout'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { WorkspaceHeader } from '@/components/workspace/workspace-header'
import { Button } from '@/components/ui/button'
import { Loader2, Hash, Users, Settings } from 'lucide-react'
import { teamImages } from '@/lib/team-images'

export default function WorkspacePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return
    }
    if (auth.currentOrg?.slug !== orgSlug) {
      auth.selectOrg(orgSlug).catch(() => router.replace('/login'))
    }
  }, [orgSlug, auth, router])

  if (!auth.isAuthenticated || !auth.currentOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    )
  }

  function handleLogout() {
    auth.logout()
    router.push('/login')
  }

  // Feature-based: easily add new nav items here
  const navItems = [
    { icon: Hash, label: 'General' },
    { icon: Users, label: 'Team' },
    { icon: Settings, label: 'Settings' },
  ]

  const sidebar = (
    <WorkspaceSidebar
      orgName={auth.currentOrg.name}
      orgSlug={auth.currentOrg.slug}
      userDisplayName={auth.user?.displayName ?? ''}
      userEmail={auth.user?.email ?? ''}
      navItems={navItems}
      onLogout={handleLogout}
    />
  )

  const header = <WorkspaceHeader title="# General" />

  return (
    <SidebarLayout sidebar={sidebar} header={header}>
      <div className="p-8">
        <div className="max-w-4xl space-y-6">
          {/* Welcome section with banner */}
          <section className="relative overflow-hidden rounded-2xl border border-brand-border bg-brand min-h-[220px]">
            <Image
              src={teamImages.workspaceBanner.src}
              alt={teamImages.workspaceBanner.alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand via-brand/80 to-brand-hover/70" />
            <div className="relative z-10 p-8 lg:p-10 max-w-2xl text-white space-y-2">
              <p className="text-white/70 text-xs uppercase tracking-[0.2em]">Workspace pulse</p>
              <h2 className="text-2xl lg:text-3xl font-semibold leading-tight">
                Keep everyone aligned, from quick updates to deep project threads.
              </h2>
              <p className="text-white/80 text-sm lg:text-base">
                Your team can plan, discuss, and deliver in one focused space.
              </p>
            </div>
          </section>

          {/* Content grid: welcome card + team card */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-stretch">
            <div className="bg-white rounded-xl border border-brand-border p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center mx-auto">
                <Hash className="w-6 h-6 text-brand" />
              </div>
              <h2 className="text-lg font-semibold text-brand">
                Welcome to {auth.currentOrg.name}
              </h2>
              <p className="text-sm text-brand-muted">
                Your workspace is ready. Invite your team to get started.
              </p>
              <Button className="bg-brand hover:bg-brand-hover text-white mt-2 cursor-pointer">
                Invite teammates
              </Button>
            </div>

            <aside className="bg-white rounded-xl border border-brand-border overflow-hidden">
              <div className="relative h-44">
                <Image
                  src={teamImages.workspaceCard.src}
                  alt={teamImages.workspaceCard.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 320px"
                  className="object-cover"
                />
              </div>
              <div className="p-4 space-y-1.5">
                <p className="text-sm font-semibold text-brand">Team moments</p>
                <p className="text-xs text-brand-muted">
                  Add channels for squads, share updates quickly, and keep every teammate in sync.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
