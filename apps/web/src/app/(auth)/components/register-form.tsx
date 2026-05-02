'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { slugify } from '@/lib/utils'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { Label } from '@/app/shared/components/ui/label'
import { Progress } from '@/app/shared/components/ui/progress'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

interface RegisterFormProps {
  onSuccess: (orgSlug: string) => void
}

type Step = 1 | 2 | 3 | 4

const TOTAL_STEPS = 3

const stepMeta: Record<Exclude<Step, 4>, { title: string; subtitle: string }> = {
  1: { title: "What's your work email?",  subtitle: "We'll use this to set up your account." },
  2: { title: 'Create your account',      subtitle: 'Tell us a bit about yourself.' },
  3: { title: 'Name your workspace',      subtitle: 'This is where your team will collaborate.' },
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [step, setStep] = useState<Step>(1)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const auth = useAuth()
  const onSuccessRef = useRef(onSuccess)

  function handleOrgNameChange(name: string) {
    setOrgName(name)
    setOrgSlug(slugify(name))
  }

  function handleOrgSlugChange(slug: string) {
    setOrgSlug(
      slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-|-$/g, '')
    )
  }

  async function handleStep1(e: React.SubmitEvent) {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    setStep(2)
  }

  async function handleStep2(e: React.SubmitEvent) {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) {
      setError('Display name is required'); return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters'); return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match'); return
    }
    setStep(3)
  }

  async function handleStep3(e: React.SubmitEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!orgName.trim()) {
        throw new Error('Workspace name is required')
      }
      if (!orgSlug.trim()) {
        throw new Error('Workspace URL is required')
      }
      await auth.register({
        displayName: displayName.trim(),
        email: email.toLowerCase().trim(),
        password,
        orgName: orgName.trim(),
        orgSlug: orgSlug.toLowerCase(),
      })
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handlers = { 1: handleStep1, 2: handleStep2, 3: handleStep3 }

  // Keep onSuccess ref in sync
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  // Auto-redirect on success after 1.5 seconds
  useEffect(() => {
    if (step !== 4) {
      return
    }
    const timer = setTimeout(() => {
      onSuccessRef.current(orgSlug)
    }, 1500)
    return () => clearTimeout(timer)
  }, [step, orgSlug])

  if (step === 4) {
    return (
      <div className="space-y-8 text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="w-14 h-14 text-brand" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-brand tracking-tight">You&apos;re all set!</h1>
          <p className="text-sm text-brand-muted">
            Your workspace <span className="font-medium text-brand">{orgName}</span> is ready.
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
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-brand-muted">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-1" />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold text-brand tracking-tight">{meta.title}</h1>
        <p className="text-sm text-brand-muted">{meta.subtitle}</p>
      </div>

      <form onSubmit={handlers[step]} className="space-y-4">
        {step === 1 && (
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
          </div>
        )}

        {step === 2 && (
          <>
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

        {step === 3 && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Workspace name</Label>
              <Input
                id="orgName"
                type="text"
                placeholder="Acme Corp"
                value={orgName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orgSlug">Workspace URL</Label>
              <div className="flex items-center gap-0">
                <span className="h-9 px-3 flex items-center text-sm text-brand-muted bg-muted border border-r-0 border-brand-border rounded-l-md shrink-0">
                  serenity.app/
                </span>
                <Input
                  id="orgSlug"
                  type="text"
                  placeholder="acme-corp"
                  value={orgSlug}
                  onChange={(e) => handleOrgSlugChange(e.target.value)}
                  disabled={loading}
                  required
                  className="rounded-l-none"
                />
              </div>
            </div>
          </>
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
                setError(''); setStep((s) => (s - 1) as Step)
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
            {loading ? 'Creating…' : step === 3 ? 'Create workspace' : 'Continue →'}
          </Button>
        </div>
      </form>

      {step === 1 && (
        <p className="text-center text-sm text-brand-muted">
          Already have an account?{' '}
          <a href="/login" className="text-brand font-medium hover:underline underline-offset-4">
            Sign in
          </a>
        </p>
      )}
    </div>
  )
}
