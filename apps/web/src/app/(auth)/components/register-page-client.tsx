'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { RegisterForm } from '@/app/(auth)/components/register-form'
import { JoinOrgForm } from '@/app/(auth)/components/join-org-form'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const auth = useAuthStore(
    useShallow((state) => ({
      currentOrg: state.currentOrg,
      initializing: state.initializing,
      isAuthenticated: state.token !== null,
    })),
  )
  const [isInviteFlow, setIsInviteFlow] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [inviteOrgName, setInviteOrgName] = useState('')

  useEffect(() => {
    // Check for invite flow
    const token = sessionStorage.getItem('invite_token')
    const email = sessionStorage.getItem('invite_email')
    const orgName = sessionStorage.getItem('invite_orgName')

    if (token && email && orgName) {
      setIsInviteFlow(true)
      setInviteToken(token)
      setInviteEmail(email)
      setInviteOrgName(orgName)
      // Clean up but keep for form use
      sessionStorage.removeItem('invite_email')
      return
    }

    if (!auth.initializing && auth.isAuthenticated && auth.currentOrg) {
      router.replace(`/${auth.currentOrg.slug}`)
    }
  }, [auth.isAuthenticated, auth.initializing, auth.currentOrg, router])

  if (auth.initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  const handleSuccess = (slug: string) => {
    const notification = sessionStorage.getItem('invite_notification')

    if (notification) {
      sessionStorage.removeItem('invite_notification')
    }

    if (isInviteFlow) {
      const nextPath = notification
        ? `/${slug}?notification=${encodeURIComponent(notification)}`
        : `/${slug}`
      window.location.assign(nextPath)
    } else {
      // New org creators go to email settings to connect their Google account
      router.push(`/${slug}/settings?tab=email`)
    }
  }

  if (isInviteFlow) {
    return (
      <JoinOrgForm
        onSuccess={handleSuccess}
        prefillEmail={inviteEmail}
        inviteToken={inviteToken}
        orgName={inviteOrgName}
      />
    )
  }

  return <RegisterForm onSuccess={handleSuccess} />
}
