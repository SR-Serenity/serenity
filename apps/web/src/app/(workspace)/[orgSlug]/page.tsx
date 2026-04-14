'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'

export default function WorkspacePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isAuthenticated) return
    if (auth.currentOrg?.slug !== orgSlug) {
      auth.selectOrg(orgSlug).catch(() => {
        router.replace('/login')
      })
    }
  }, [orgSlug, auth, router])

  if (!auth.isAuthenticated || !auth.currentOrg) {
    return null
  }

  function handleLogout() {
    auth.logout()
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb]">
      <header className="bg-white border-b border-[#e4e7ec] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-[#101828]">{auth.currentOrg.name}</h1>
          <span className="text-sm text-[#667085]">/{auth.currentOrg.slug}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-[#101828]">{auth.user?.displayName}</p>
            <p className="text-xs text-[#667085]">{auth.user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-[#344054] border border-[#d0d5dd] rounded-lg px-3 py-2 hover:bg-[#f9fafb] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="p-8">
        <div className="bg-white border border-[#e4e7ec] rounded-xl p-8 text-center max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-[#101828] mb-2">
            Welcome to {auth.currentOrg.name}
          </h2>
          <p className="text-[#667085]">Your workspace is ready. More features coming soon.</p>
        </div>
      </div>
    </main>
  )
}
