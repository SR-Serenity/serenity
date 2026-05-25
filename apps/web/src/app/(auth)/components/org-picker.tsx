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
        className="flex items-center gap-1.5 text-sm text-[var(--theme-darker-color)] transition-colors hover:text-[var(--theme-caption-color)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--theme-caption-color)]">Choose a workspace</h2>
        <p className="text-sm text-[var(--theme-darker-color)]">
          You have access to {organizations.length} workspace{organizations.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-2">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => handleSelect(org.slug)}
            disabled={loading !== ''}
            className="flex w-full items-center gap-3 rounded-lg border border-[var(--theme-divider-color)] bg-[var(--theme-panel-color)] p-3.5 text-left transition-all hover:border-blue-300 hover:bg-[var(--highlight-hover)] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-sm font-semibold text-white">
              {getInitials(org.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-[var(--theme-caption-color)]">{org.name}</p>
              <p className="truncate text-xs text-[var(--theme-darker-color)]">{org.slug}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="text-xs capitalize">{org.role}</Badge>
              {loading === org.slug && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
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
