'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, MessageSquarePlus, Search, X } from 'lucide-react'
import type { Member } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { cn } from '@/lib/utils'
import { DiceBearAvatar } from '@/components/dicebear-avatar'

type CreateDmDialogProps = {
  currentUserId: string
  onClose: () => void
  onCreate: (memberId: string) => Promise<void>
  onLoadMembers: () => Promise<Member[]>
}

export function CreateDmDialog({ currentUserId, onClose, onCreate, onLoadMembers }: CreateDmDialogProps) {
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
      .then(loaded => { if (active) setMembers(loaded.filter(m => m.id !== currentUserId)) })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Failed to load members') })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [currentUserId, onLoadMembers])

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(m =>
      m.displayName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.departmentName?.toLowerCase().includes(q)
    )
  }, [members, search])

  const selectedMember = members.find(m => m.id === selectedMemberId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMemberId || isCreating) return
    setIsCreating(true)
    setError(null)
    try {
      await onCreate(selectedMemberId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create DM')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[82vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04]">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-txt">
              <MessageSquarePlus className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-foreground">New direct message</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Search workspace members</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, role, or department"
                className="h-9 rounded-xl pl-9 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent/60"
                disabled={isLoading || isCreating}
                autoFocus
              />
            </div>
            {selectedMember && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-txt">
                <span>{selectedMember.displayName}</span>
                <button
                  type="button"
                  onClick={() => setSelectedMemberId(null)}
                  className="rounded-full p-0.5 hover:bg-accent/20 transition-colors duration-150"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No members found</p>
            ) : (
              filteredMembers.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMemberId(member.id)}
                  disabled={isCreating}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150',
                    selectedMemberId === member.id
                      ? 'bg-accent/[0.08] text-foreground'
                      : 'hover:bg-popup-hover hover:translate-x-0.5'
                  )}
                >
                  <DiceBearAvatar
                    seed={member.id}
                    name={member.displayName}
                    className="h-9 w-9 rounded-lg transition-transform duration-150 group-hover:scale-105"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{member.displayName}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {member.email}{member.departmentName ? ` · ${member.departmentName}` : ''}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {member.role}
                  </span>
                </button>
              ))
            )}
          </div>

          {error && (
            <div className="border-t border-destructive/20 bg-destructive/10 px-5 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedMemberId || isCreating} className="active:scale-[0.97]">
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Start DM
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
