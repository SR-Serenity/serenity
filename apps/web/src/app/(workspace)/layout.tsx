'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Spinner } from '@serenity/ui'
import { useAuth } from '@/hooks/use-auth'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const auth = useAuth()

  useEffect(() => {
    if (auth.initializing) return
    if (!auth.isAuthenticated) {
      router.replace('/login')
    }
  }, [auth.isAuthenticated, auth.initializing, router])

  if (auth.initializing || !auth.isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  return <>{children}</>
}
