'use client'

import { useState, useEffect, useRef } from 'react'
import { authApi } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { Label } from '@/app/shared/components/ui/label'
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  User,
  Building2,
  Lock,
  Loader2,
  AlertCircle,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

interface JoinOrgFormProps {
  onSuccess: (orgSlug: string) => void
  prefillEmail: string
  inviteToken: string
  orgName: string
}

type Step = 1 | 2 | 3

const stepConfig = [
  { step: 1, icon: User,      label: 'Account'      },
  { step: 2, icon: Building2, label: 'Join org'     },
] as const

const stepMeta: Record<Exclude<Step, 3>, { title: string; subtitle: string }> = {
  1: { title: 'Create your account', subtitle: 'Secure your account with a strong password.' },
  2: { title: 'Confirm and join',    subtitle: "You're about to join" },
}

function getPasswordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string; colorClass: string } {
  if (!password) return { score: 0, label: '', colorClass: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  score = Math.min(4, score) as 0 | 1 | 2 | 3 | 4

  const levels: Record<number, { label: string; colorClass: string }> = {
    0: { label: '',        colorClass: '' },
    1: { label: 'Weak',   colorClass: 'bg-red-500' },
    2: { label: 'Fair',   colorClass: 'bg-amber-500' },
    3: { label: 'Good',   colorClass: 'bg-blue-500' },
    4: { label: 'Strong', colorClass: 'bg-green-500' },
  }
  return { score: score as 0 | 1 | 2 | 3 | 4, ...levels[score] }
}

export function JoinOrgForm({
  onSuccess,
  prefillEmail,
  inviteToken,
  orgName,
}: JoinOrgFormProps) {
  const setSession = useAuthStore((state) => state.setSession)
  const [step, setStep]                       = useState<Step>(1)
  const [displayName, setDisplayName]         = useState('')
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const [orgSlug, setOrgSlug]                 = useState('')
  const [showPassword, setShowPassword]       = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const onSuccessRef = useRef(onSuccess)

  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

  async function submitAccountDetails(e: React.SubmitEvent) {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) {
      setError('Full name is required.')
      return
    }
    if (displayName.trim().length > 100) {
      setError('Name must be under 100 characters.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
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

      throw new Error('Failed to join organization.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])

  useEffect(() => {
    if (step !== 3) return
    const timer = setTimeout(() => { onSuccessRef.current(orgSlug) }, 2000)
    return () => clearTimeout(timer)
  }, [step, orgSlug])

  if (step === 3) {
    return (
      <div className="space-y-8 text-center">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 ring-8 ring-green-50/60">
            <CheckCircle2 className="h-10 w-10 text-green-600" strokeWidth={1.5} />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--theme-caption-color)]">Welcome aboard!</h1>
          <p className="text-sm text-[var(--theme-darker-color)]">
            You&apos;ve joined{' '}
            <span className="font-semibold text-[var(--theme-caption-color)]">{orgName}</span>.
            Redirecting you now…
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--theme-darker-color)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Opening workspace</span>
        </div>
        <Button
          onClick={() => onSuccessRef.current(orgSlug)}
          className="h-10 w-full cursor-pointer bg-blue-600 font-semibold text-white hover:bg-blue-700"
        >
          Go now →
        </Button>
      </div>
    )
  }

  const meta = stepMeta[step]

  return (
    <div className="space-y-7">
      {/* Step indicators */}
      <div className="flex items-center gap-0">
        {stepConfig.map(({ step: s, icon: Icon, label }, idx) => {
          const isCompleted = step > s
          const isCurrent   = step === s
          return (
            <div key={s} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200',
                    isCompleted
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : isCurrent
                        ? 'border-blue-600 bg-white text-blue-600'
                        : 'border-slate-200 bg-white text-slate-400',
                  ].join(' ')}
                >
                  {isCompleted
                    ? <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                    : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span
                  className={[
                    'text-[10px] font-medium leading-none',
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-slate-500' : 'text-slate-400',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
              {idx < stepConfig.length - 1 && (
                <div
                  className={[
                    'mb-5 h-px flex-1 transition-colors duration-200',
                    step > s + 1 ? 'bg-blue-600' : step > s ? 'bg-blue-300' : 'bg-slate-200',
                  ].join(' ')}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-[var(--theme-caption-color)]">{meta.title}</h1>
        <p className="text-sm text-[var(--theme-darker-color)]">
          {meta.subtitle}
          {step === 2 && <span className="font-semibold text-[var(--theme-caption-color)]"> {orgName}</span>}
        </p>
      </div>

      <form
        onSubmit={step === 1 ? submitAccountDetails : submitInviteRegistration}
        className="space-y-4"
        noValidate
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
                autoComplete="email"
                className="bg-slate-50 text-[var(--theme-darker-color)] cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="displayName">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Jane Smith"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                  autoComplete="name"
                  maxLength={100}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="new-password"
                  maxLength={128}
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={[
                          'h-1 flex-1 rounded-full transition-all duration-300',
                          passwordStrength.score >= level
                            ? passwordStrength.colorClass
                            : 'bg-slate-100',
                        ].join(' ')}
                      />
                    ))}
                  </div>
                  {passwordStrength.label && (
                    <p className={[
                      'text-xs font-medium',
                      passwordStrength.score <= 1 ? 'text-red-600' :
                      passwordStrength.score === 2 ? 'text-amber-600' :
                      passwordStrength.score === 3 ? 'text-blue-600' : 'text-green-600',
                    ].join(' ')}>
                      {passwordStrength.label}
                      {passwordStrength.score < 3 && ' — add uppercase, numbers, or symbols'}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="new-password"
                  maxLength={128}
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={['text-xs font-medium', passwordsMatch ? 'text-green-600' : 'text-red-600'].join(' ')}>
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Users className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-blue-900">{orgName}</p>
                  <p className="text-xs text-blue-700">You&apos;ve been invited to join this organization</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-[var(--theme-darker-color)]">
              Click <span className="font-medium text-[var(--theme-caption-color)]">Join organization</span> to accept your invitation and get started.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2.5" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => { setError(''); setStep((s) => (s - 1) as Step) }}
              disabled={loading}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="h-10 flex-1 cursor-pointer bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Joining…</>
              : step === 2 ? 'Join organization' : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  )
}
