'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { OrgPicker } from '@/components/auth/org-picker'
import { useAuth } from '@/hooks/use-auth'
import type { LoginResult, OrgSummary } from '@serenity/api'
import { Loader2 } from 'lucide-react'

type Phase = 'credentials' | 'org_select'

export default function LoginPage() {
  const router = useRouter()
  const auth = useAuth()
  const [phase, setPhase] = useState<Phase>('credentials')
  const [pendingOrgs, setPendingOrgs] = useState<OrgSummary[]>([])

  useEffect(() => {
    if (!auth.initializing && auth.isAuthenticated && auth.currentOrg) {
      router.replace(`/${auth.currentOrg.slug}`)
    }
  }, [auth.isAuthenticated, auth.initializing, auth.currentOrg, router])

  if (auth.initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    )
  }

  async function handleLoginSuccess(result: LoginResult) {
    if (result.type === 'single_org') {
      router.push(`/${result.slug}`)
    } else {
      setPendingOrgs(result.organizations)
      setPhase('org_select')
    }
  }

  async function handleSelectOrg(slug: string) {
    await auth.selectOrg(slug)
    router.push(`/${slug}`)
  }

  return phase === 'credentials' ? (
    <LoginForm onSuccess={handleLoginSuccess} />
  ) : (
    <OrgPicker
      organizations={pendingOrgs}
      onSelect={handleSelectOrg}
      onBack={() => setPhase('credentials')}
    />
  )
}
