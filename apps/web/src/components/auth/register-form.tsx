'use client'

import { FormEvent, useState } from 'react'
import { Button, Input } from '@serenity/ui'
import { useAuth } from '@/hooks/use-auth'
import { slugify } from '@/lib/utils'

interface RegisterFormProps {
  onSuccess: (orgSlug: string) => void
}

type Step = 1 | 2

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [step, setStep] = useState<Step>(1)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const auth = useAuth()

  function handleOrgNameChange(name: string) {
    setOrgName(name)
    setOrgSlug(slugify(name))
  }

  function handleOrgSlugChange(slug: string) {
    const sanitized = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-|-$/g, '')
    setOrgSlug(sanitized)
  }

  async function handleStep1(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email is invalid')
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

  async function handleStep2(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!orgName.trim()) {
        throw new Error('Workspace name is required')
      }
      if (!orgSlug.trim()) {
        throw new Error('Workspace slug is required')
      }

      await auth.register({
        displayName: displayName.trim(),
        email: email.toLowerCase().trim(),
        password,
        orgName: orgName.trim(),
        orgSlug: orgSlug.toLowerCase(),
      })

      onSuccess(orgSlug.toLowerCase())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={step === 1 ? handleStep1 : handleStep2} className="flex flex-col gap-4 w-full max-w-sm p-8 bg-white border border-gray-200 rounded-xl">
      {/* Step indicator */}
      <div className="flex gap-2 justify-center mb-4">
        <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`} />
        <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
      </div>

      {step === 1 ? (
        <>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
            <p className="mt-1 text-sm text-gray-600">Step 1 of 2</p>
          </div>

          <Input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
        </>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Create your workspace</h1>
            <p className="mt-1 text-sm text-gray-600">Step 2 of 2</p>
          </div>

          <Input
            type="text"
            placeholder="Workspace name"
            value={orgName}
            onChange={(e) => handleOrgNameChange(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            type="text"
            placeholder="Workspace slug (e.g. acme-corp)"
            value={orgSlug}
            onChange={(e) => handleOrgSlugChange(e.target.value)}
            disabled={loading}
            required
          />
        </>
      )}

      {error && (
        <p className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </p>
      )}

      <div className="flex gap-3 mt-2">
        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(1)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-900 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-300 disabled:opacity-60 transition-colors"
          >
            ← Back
          </button>
        )}
        <Button type="submit" loading={loading} className={step === 1 ? '' : 'flex-1'}>
          {step === 1 ? 'Continue →' : 'Create workspace'}
        </Button>
      </div>

      {step === 1 && (
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline font-medium">
            Sign in
          </a>
        </p>
      )}
    </form>
  )
}
