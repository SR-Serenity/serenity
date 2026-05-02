'use client'

import { useState } from 'react'
import type { OrgSummary } from '@serenity/api'
import { Badge } from '@/app/shared/components/ui/badge'
import { ArrowLeft, Loader2 } from 'lucide-react'

interface OrgPickerProps {
  organizations: OrgSummary[]
  onSelect: (slug: string) => Promise<void>
  onBack: () => void
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function OrgPicker({ organizations, onSelect, onBack }: OrgPickerProps) {
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')

  async function handleSelect(slug: string) {
    setLoading(slug)
    setError('')
    try {
      await onSelect(slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select workspace')
      setLoading('')
    }
  }

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold text-brand tracking-tight">Choose a workspace</h2>
        <p className="text-sm text-brand-muted">
          You have access to {organizations.length} workspace{organizations.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-2">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => handleSelect(org.slug)}
            disabled={loading !== ''}
            className="w-full flex items-center gap-3 p-3.5 rounded-lg border border-brand-border bg-white hover:border-brand hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left"
          >
            <div className="w-9 h-9 rounded-md bg-brand flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {getInitials(org.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-brand text-sm truncate">{org.name}</p>
              <p className="text-xs text-brand-muted truncate">{org.slug}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="text-xs capitalize">{org.role}</Badge>
              {loading === org.slug && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
            </div>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}
