'use client'

import { useEffect, useMemo, useState } from 'react'
import { Hash, Loader2, Lock, Search, X } from 'lucide-react'
import type { ChatConversationType, Member } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { Label } from '@/app/shared/components/ui/label'
import { cn } from '@/lib/utils'

type ChannelType = Exclude<ChatConversationType, 'DM'>

type CreateChannelDialogProps = {
  currentUserId: string
  onClose: () => void
  onCreate: (name: string, type: ChannelType, memberIds: string[]) => Promise<void>
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

export function CreateChannelDialog({
  currentUserId,
  onClose,
  onCreate,
  onLoadMembers,
}: CreateChannelDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<ChannelType>('PUBLIC_CHANNEL')
  const [members, setMembers] = useState<Member[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoadingMembers(true)
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
        if (active) setIsLoadingMembers(false)
      })

    return () => {
      active = false
    }
  }, [currentUserId, onLoadMembers])

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()
    if (!query) return members
    return members.filter(member =>
      member.displayName.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.departmentName?.toLowerCase().includes(query)
    )
  }, [members, memberSearch])

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || isCreating) return

    setIsCreating(true)
    setError(null)
    try {
      await onCreate(name.trim(), type, selectedMemberIds)
      onClose()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create channel')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Create channel</h2>
            <p className="text-sm text-gray-500">Give team work a shared place</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto p-5">
          <div className="space-y-5">
            <div>
              <Label htmlFor="channel-name">Channel name</Label>
              <Input
                id="channel-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="project-launch"
                autoFocus
                disabled={isCreating}
                className="mt-2 h-10 rounded-xl border-gray-200 bg-white focus-visible:ring-blue-100"
              />
            </div>

            <div>
              <Label>Channel type</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setType('PUBLIC_CHANNEL')}
                  disabled={isCreating}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-colors',
                    type === 'PUBLIC_CHANNEL'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  )}
                >
                  <div className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                    <Hash className="h-4 w-4 text-blue-600" />
                    Public
                  </div>
                  <p className="text-sm text-gray-500">Visible to everyone in workspace.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setType('PRIVATE_CHANNEL')}
                  disabled={isCreating}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-colors',
                    type === 'PRIVATE_CHANNEL'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  )}
                >
                  <div className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                    <Lock className="h-4 w-4 text-blue-600" />
                    Private
                  </div>
                  <p className="text-sm text-gray-500">Only invited members can access.</p>
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Invite members</Label>
                <span className="text-xs text-gray-500">{selectedMemberIds.length} selected</span>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="relative border-b border-gray-100">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Search members"
                    disabled={isCreating || isLoadingMembers}
                    className="h-10 border-0 bg-transparent pl-9 focus-visible:ring-0"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto p-2">
                  {isLoadingMembers ? (
                    <div className="flex justify-center py-8 text-gray-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">No members found</div>
                  ) : (
                    filteredMembers.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(member.id)}
                        disabled={isCreating}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                          selectedMemberIds.includes(member.id)
                            ? 'bg-blue-50'
                            : 'hover:bg-gray-50'
                        )}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-[11px] font-semibold text-white">
                          {initials(member.displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-gray-900">{member.displayName}</div>
                          <div className="truncate text-xs text-gray-500">{member.email}</div>
                        </div>
                        <div
                          className={cn(
                            'h-4 w-4 rounded border',
                            selectedMemberIds.includes(member.id)
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300'
                          )}
                        />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create channel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
