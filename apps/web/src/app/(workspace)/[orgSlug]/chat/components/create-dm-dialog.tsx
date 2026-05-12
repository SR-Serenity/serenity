'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, MessageSquarePlus, Search, X } from 'lucide-react'
import type { Member } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { cn } from '@/lib/utils'

type CreateDmDialogProps = {
  currentUserId: string
  onClose: () => void
  onCreate: (memberId: string) => Promise<void>
  onLoadMembers: () => Promise<Member[]>
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'U'
}

export function CreateDmDialog({
  currentUserId,
  onClose,
  onCreate,
  onLoadMembers,
}: CreateDmDialogProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    onLoadMembers()
      .then(loadedMembers => {
        if (!active) return
        setMembers(loadedMembers.filter(member => member.id !== currentUserId))
      })
      .catch(loadError => {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load members')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [currentUserId, onLoadMembers])

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return members
    }
    return members.filter(member =>
      member.displayName.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      member.departmentName?.toLowerCase().includes(query)
    )
  }, [members, search])

  const selectedMember = members.find(member => member.id === selectedMemberId)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedMemberId || isCreating) return

    setIsCreating(true)
    setError(null)
    try {
      await onCreate(selectedMemberId)
      onClose()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create DM')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="flex max-h-[82vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <MessageSquarePlus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-gray-900">New direct message</h2>
              <p className="text-sm text-gray-500">Search workspace members</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-gray-100 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, role, or department"
                className="h-10 rounded-xl border-gray-200 bg-white pl-9 focus-visible:ring-blue-100"
                disabled={isLoading || isCreating}
                autoFocus
              />
            </div>
            {selectedMember && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm text-blue-700">
                <span>{selectedMember.displayName}</span>
                <button
                  type="button"
                  onClick={() => setSelectedMemberId(null)}
                  className="rounded-full hover:bg-blue-100"
                  title="Clear selection"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">No members found</div>
            ) : (
              filteredMembers.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMemberId(member.id)}
                  disabled={isCreating}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    selectedMemberId === member.id
                      ? 'bg-blue-50 text-gray-900'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-xs font-semibold text-white">
                    {initials(member.displayName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-gray-900">{member.displayName}</div>
                    <div className="truncate text-xs text-gray-500">
                      {member.email}
                      {member.departmentName ? ` · ${member.departmentName}` : ''}
                    </div>
                  </div>
                  <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] uppercase text-gray-500">
                    {member.role}
                  </span>
                </button>
              ))
            )}
          </div>

          {error && <div className="border-t border-red-100 bg-red-50 px-5 py-2 text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedMemberId || isCreating}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Start DM
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
