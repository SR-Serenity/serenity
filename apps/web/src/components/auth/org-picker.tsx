'use client'

import { useState } from 'react'
import type { OrgSummary } from '@serenity/api'

interface OrgPickerProps {
  organizations: OrgSummary[]
  onSelect: (slug: string) => Promise<void>
  onBack: () => void
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
      setError(err instanceof Error ? err.message : 'Failed to select organization')
      setLoading('')
    }
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-sm p-8 bg-white border border-gray-200 rounded-xl">
      <button onClick={onBack} className="text-blue-600 text-sm font-medium hover:underline text-left">
        ← Back
      </button>

      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Select a workspace</h2>
        <p className="mt-1 text-sm text-gray-600">You have access to multiple workspaces</p>
      </div>

      <div className="flex flex-col gap-3">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => handleSelect(org.slug)}
            disabled={loading !== ''}
            className="flex items-center justify-between p-4 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-left"
          >
            <div className="flex flex-col gap-1">
              <div className="font-medium text-gray-900">{org.name}</div>
              <div className="text-sm text-gray-600">{org.slug}</div>
              <div className="text-xs text-gray-500 capitalize">{org.role}</div>
            </div>
            {loading === org.slug && <div className="text-sm text-blue-600">Loading…</div>}
          </button>
        ))}
      </div>

      {error && (
        <p className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
