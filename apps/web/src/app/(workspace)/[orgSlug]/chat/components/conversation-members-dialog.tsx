'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, UserPlus, X } from 'lucide-react'
import type { ChatConversation, Member } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { cn } from '@/lib/utils'

type ConversationMembersDialogProps = {
  mode: 'view' | 'add'
  conversation: ChatConversation
  currentUserId: string
  onClose: () => void
  onLoadMembers: () => Promise<Member[]>
  onAddMembers: (memberIds: string[]) => Promise<void>
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

export function ConversationMembersDialog({
  mode,
  conversation,
  currentUserId,
  onClose,
  onLoadMembers,
  onAddMembers,
}: ConversationMembersDialogProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [query, setQuery] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(mode === 'add')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existingMemberIds = useMemo(
    () => new Set(conversation.members.map(member => member.userId)),
    [conversation.members],
  )

  useEffect(() => {
    if (mode !== 'add') return
    let active = true
    setIsLoading(true)
    onLoadMembers()
      .then(loadedMembers => {
        if (!active) return
        setMembers(loadedMembers.filter(member => member.id !== currentUserId && !existingMemberIds.has(member.id)))
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
  }, [currentUserId, existingMemberIds, mode, onLoadMembers])

  const visibleMembers = useMemo(() => {
    const source = mode === 'view'
      ? conversation.members.map(member => ({
          id: member.userId,
          displayName: member.user.displayName,
          email: member.user.email ?? '',
          role: 'MEMBER' as const,
          departmentId: null,
          departmentName: null,
          joinedAt: member.joinedAt,
        }))
      : members
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return source
    return source.filter(member =>
      member.displayName.toLowerCase().includes(normalizedQuery) ||
      member.email.toLowerCase().includes(normalizedQuery),
    )
  }, [conversation.members, members, mode, query])

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId],
    )
  }

  const handleAdd = async () => {
    if (selectedMemberIds.length === 0 || isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      await onAddMembers(selectedMemberIds)
      onClose()
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Failed to add members')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="flex max-h-[86vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {mode === 'add' ? 'Add members' : 'Members'}
            </h2>
            <p className="text-sm text-gray-500">{conversation.name ?? 'Group chat'}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 overflow-y-auto p-5">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search members"
              className="h-10 rounded-xl border-gray-200 bg-white pl-9 focus-visible:ring-blue-100"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : visibleMembers.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No members found</div>
          ) : (
            <div className="space-y-1">
              {visibleMembers.map(member => {
                const selected = selectedMemberIds.includes(member.id)
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => mode === 'add' && toggleMember(member.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      mode === 'add' && selected ? 'bg-blue-50' : 'hover:bg-gray-50',
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-[11px] font-semibold text-white">
                      {initials(member.displayName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-gray-900">{member.displayName}</div>
                      <div className="truncate text-xs text-gray-500">{member.email}</div>
                    </div>
                    {mode === 'add' && (
                      <div className={cn('h-4 w-4 rounded border', selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300')} />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
        </div>

        {mode === 'add' && (
          <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleAdd()}
              disabled={selectedMemberIds.length === 0 || isSaving}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Add members
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
