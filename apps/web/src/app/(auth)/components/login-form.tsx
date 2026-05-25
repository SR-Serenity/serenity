'use client'

import { FormEvent, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import type { LoginResult } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { Label } from '@/app/shared/components/ui/label'

interface LoginFormProps {
  onSuccess: (result: LoginResult) => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((state) => state.login)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await login(email, password)
      onSuccess(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--theme-caption-color)]">Welcome back</h1>
        <p className="text-sm text-[var(--theme-darker-color)]">Sign in to your workspace to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
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

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-10 w-full cursor-pointer bg-blue-600 font-medium text-white hover:bg-blue-500"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--theme-darker-color)]">
        Don&apos;t have an account?{' '}
        <a href="/register" className="font-medium text-blue-600 underline-offset-4 hover:underline">
          Create one
        </a>
      </p>
    </div>
  )
}
