'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { RegisterForm } from '@/components/auth/register-form'
import { Spinner } from '@serenity/ui'
import { useAuth } from '@/hooks/use-auth'

export default function RegisterPage() {
  const router = useRouter()
  const auth = useAuth()

  useEffect(() => {
    if (!auth.initializing && auth.isAuthenticated && auth.currentOrg) {
      router.replace(`/${auth.currentOrg.slug}`)
    }
  }, [auth.isAuthenticated, auth.initializing, auth.currentOrg, router])

  if (auth.initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  function handleRegisterSuccess(orgSlug: string) {
    router.push(`/${orgSlug}`)
  }

  return (
    <div className="w-full max-w-[420px]">
      <RegisterForm onSuccess={handleRegisterSuccess} />
    </div>
  )
}
