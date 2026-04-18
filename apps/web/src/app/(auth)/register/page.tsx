'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { RegisterForm } from '@/components/auth/register-form'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

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
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    )
  }

  return <RegisterForm onSuccess={(slug) => router.push(`/${slug}`)} />
}
