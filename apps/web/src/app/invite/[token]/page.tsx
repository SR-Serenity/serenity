'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { authApi } from '@serenity/api'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'
import type { AcceptInvitationResponse, AuthResponse } from '@serenity/api'

function isAuthResponse(res: AcceptInvitationResponse): res is AuthResponse {
  return 'accessToken' in res
}

function InvitePageContent() {
  const router = useRouter()
  const params = useParams()
  const auth = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [blockedByAccount, setBlockedByAccount] = useState(false)

  const token = (params.token as string) || ''

  useEffect(() => {
    // Wait for auth to initialize before processing invite
    if (auth.initializing) {
      return
    }

    // If no token, show error
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    processInvite()

    async function processInvite() {
      try {
        setBlockedByAccount(false)
        const response = await authApi.acceptInvitation(token)

        if (isAuthResponse(response)) {
          // Backend found user and added them to org - auto-login and redirect
          if (!response.organization) {
            setError('Organization information missing from invitation')
            setLoading(false)
            return
          }
          localStorage.setItem('invite_access_token', response.accessToken)
          localStorage.setItem('invite_org', JSON.stringify(response.organization))
          // Show notification that they've been added to org
          sessionStorage.setItem(
            'invite_notification',
            `You've been added to ${response.organization.name}`
          )
          window.location.replace(`/${response.organization.slug}`)
        } else {
          // Backend says user needs to register first
          const inviteEmail = response.email

          if (auth.isAuthenticated && auth.user && auth.user.email === inviteEmail) {
            // Stale local auth can disagree with the backend after local DB resets.
            setBlockedByAccount(true)
            setError('Please log out first, then continue this invitation.')
            setLoading(false)
          } else if (auth.isAuthenticated && auth.user) {
            // User logged in as different email than invitation
            setBlockedByAccount(true)
            setError(
              `Invitation is for ${inviteEmail}. You are logged in as ${auth.user.email}. ` +
                'Please log out first.'
            )
          } else {
            // No user logged in - redirect to register with invite pre-fill
            sessionStorage.setItem('invite_email', inviteEmail)
            sessionStorage.setItem('invite_token', token)
            sessionStorage.setItem('invite_orgName', response.orgName)
            sessionStorage.setItem('invite_role', response.role)
            if (response.departmentId) {
              sessionStorage.setItem('invite_departmentId', response.departmentId)
            }
            router.replace('/register')
          }
        }
      } catch (err) {
        console.error('Error accepting invitation:', err)
        setError(err instanceof Error ? err.message : 'Invalid or expired invitation')
        setLoading(false)
      }
    }
  }, [token, auth.initializing, auth.isAuthenticated, auth.user, router])

  if (auth.initializing || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
        <p className="text-sm text-brand-muted">Processing invitation...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 max-w-md mx-auto">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-brand">Cannot Join</h1>
          <p className="text-sm text-brand-muted">{error}</p>
        </div>
        <button
          onClick={() => {
            auth.logout()
            if (blockedByAccount) {
              window.location.replace(`/invite/${token}`)
              return
            }
            router.replace('/login')
          }}
          className="text-sm text-brand hover:underline"
        >
          {blockedByAccount ? 'Log out and continue invite' : 'Go to login'}
        </button>
      </div>
    )
  }

  return null
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      }
    >
      <InvitePageContent />
    </Suspense>
  )
}
