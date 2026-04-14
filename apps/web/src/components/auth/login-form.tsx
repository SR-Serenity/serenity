'use client'

import { FormEvent, useState } from 'react'
import { Button, Input } from '@serenity/ui'
import { useAuth } from '@/hooks/use-auth'
import type { LoginResult } from '@serenity/api'

interface LoginFormProps {
  onSuccess: (result: LoginResult) => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const auth = useAuth()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await auth.login(email, password)
      onSuccess(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm p-8 bg-white border border-gray-200 rounded-xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">Welcome back to your workspace</p>
      </div>

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
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        required
      />

      {error && (
        <p className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading}>
        Sign in
      </Button>

      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <a href="/register" className="text-blue-600 hover:underline font-medium">
          Create one
        </a>
      </p>
    </form>
  )
}
