'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { RegisterForm } from '@/components/auth/register-form'
import { JoinOrgForm } from '@/components/auth/join-org-form'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const auth = useAuth()
  const [isInviteFlow, setIsInviteFlow] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [inviteOrgName, setInviteOrgName] = useState('')

  useEffect(() => {
    if (!auth.initializing && auth.isAuthenticated && auth.currentOrg) {
      router.replace(`/${auth.currentOrg.slug}`)
    }

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
    }
  }, [auth.isAuthenticated, auth.initializing, auth.currentOrg, router])

  if (auth.initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    )
  }

  const handleSuccess = (slug: string) => {
    const notification = sessionStorage.getItem('invite_notification')
    if (notification) {
      sessionStorage.removeItem('invite_notification')
      router.push(`/${slug}?notification=${encodeURIComponent(notification)}`)
    } else {
      router.push(`/${slug}`)
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
