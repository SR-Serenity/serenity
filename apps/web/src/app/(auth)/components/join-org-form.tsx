'use client'

import { useState, useEffect, useRef } from 'react'
import { authApi } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { Label } from '@/app/shared/components/ui/label'
import { Progress } from '@/app/shared/components/ui/progress'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

interface JoinOrgFormProps {
  onSuccess: (orgSlug: string) => void
  prefillEmail: string
  inviteToken: string
  orgName: string
}

type Step = 1 | 2 | 3

const TOTAL_STEPS = 2

const stepMeta: Record<Exclude<Step, 3>, { title: string; subtitle: string }> = {
  1: { title: 'Create your account', subtitle: 'Tell us a bit about yourself.' },
  2: { title: 'Joining organization', subtitle: "You're about to join" },
}

export function JoinOrgForm({
  onSuccess,
  prefillEmail,
  inviteToken,
  orgName,
}: JoinOrgFormProps) {
  const setSession = useAuthStore((state) => state.setSession)
  const [step, setStep] = useState<Step>(1)
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [orgSlug, setOrgSlug] = useState('')
  const onSuccessRef = useRef(onSuccess)

  async function submitAccountDetails(e: React.SubmitEvent) {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setStep(2)
  }

  async function submitInviteRegistration(e: React.SubmitEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const registerResponse = await authApi.registerWithInvite({
        email: prefillEmail.toLowerCase().trim(),
        password,
        displayName: displayName.trim(),
        inviteToken,
      })

      if ('accessToken' in registerResponse && registerResponse.organization) {
        setSession(registerResponse.accessToken, registerResponse.organization, displayName)

        sessionStorage.removeItem('invite_token')
        sessionStorage.removeItem('invite_email')
        sessionStorage.removeItem('invite_orgName')
        sessionStorage.removeItem('invite_role')
        sessionStorage.removeItem('invite_departmentId')

        sessionStorage.setItem(
          'invite_notification',
          `You've been added to ${registerResponse.organization.name}`
        )

        setOrgSlug(registerResponse.organization.slug)
        setStep(3)
        return
      }

      throw new Error('Failed to join organization')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (step !== 3) {
      return
    }
    const timer = setTimeout(() => {
      onSuccessRef.current(orgSlug)
    }, 1500)
    return () => clearTimeout(timer)
  }, [step, orgSlug])

  if (step === 3) {
    return (
      <div className="space-y-8 text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="w-14 h-14 text-brand" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-brand tracking-tight">You&apos;re all set!</h1>
          <p className="text-sm text-brand-muted">
            You've been added to <span className="font-medium text-brand">{orgName}</span>
          </p>
        </div>
        <Button
          onClick={() => onSuccessRef.current(orgSlug)}
          className="w-full h-10 bg-brand hover:bg-brand-hover text-white font-medium cursor-pointer"
        >
          Open workspace →
        </Button>
      </div>
    )
  }

  const meta = stepMeta[step]

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-brand-muted">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-1" />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold text-brand tracking-tight">{meta.title}</h1>
        <p className="text-sm text-brand-muted">
          {meta.subtitle}
          {step === 2 && <span className="font-medium"> {orgName}</span>}
        </p>
      </div>

      <form
        onSubmit={step === 1 ? submitAccountDetails : submitInviteRegistration}
        className="space-y-4"
      >
        {step === 1 && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                value={prefillEmail}
                disabled
                className="bg-muted text-brand-muted"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Full name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Jane Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="rounded-lg bg-brand-light p-4">
            <p className="text-sm text-brand">
              Click &quot;Join organization&quot; to confirm and join{' '}
              <span className="font-semibold">{orgName}</span>.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError('')
                setStep((s) => (s - 1) as Step)
              }}
              disabled={loading}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 h-10 bg-brand hover:bg-brand-hover text-white font-medium cursor-pointer"
          >
            {loading ? 'Joining…' : step === 2 ? 'Join organization' : 'Continue →'}
          </Button>
        </div>
      </form>
    </div>
  )
}
