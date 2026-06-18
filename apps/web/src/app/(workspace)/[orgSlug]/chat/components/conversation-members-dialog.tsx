'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, UserPlus, X } from 'lucide-react'
import type { ChatConversation, Member } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { cn } from '@/lib/utils'
import { DiceBearAvatar } from '@/components/dicebear-avatar'

type ConversationMembersDialogProps = {
  mode: 'view' | 'add'
  conversation: ChatConversation
  currentUserId: string
  onClose: () => void
  onLoadMembers: () => Promise<Member[]>
  onAddMembers: (memberIds: string[]) => Promise<void>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[86vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/55 to-transparent" />

        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {mode === 'add' ? 'Add members' : 'Members'}
            </h2>
            <p className="text-sm text-muted-foreground">{conversation.name ?? 'Group chat'}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 overflow-y-auto p-5">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search members"
              className="h-10 rounded-xl pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : visibleMembers.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No members found</div>
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
                      mode === 'add' && selected ? 'bg-accent/10' : 'hover:bg-popup-hover',
                    )}
                  >
                    <DiceBearAvatar seed={member.id} name={member.displayName} className="h-8 w-8 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">{member.displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                    </div>
                    {mode === 'add' && (
                      <div className={cn('h-4 w-4 rounded border', selected ? 'border-accent bg-accent' : 'border-border')} />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {error && <div className="mt-4 text-sm text-destructive">{error}</div>}
        </div>

        {mode === 'add' && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleAdd()}
              disabled={selectedMemberIds.length === 0 || isSaving}
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
