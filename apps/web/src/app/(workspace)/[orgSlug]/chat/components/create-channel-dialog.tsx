'use client'

import { useEffect, useMemo, useState } from 'react'
import { Hash, Loader2, Lock, Search, X } from 'lucide-react'
import type { ChatConversationType, Member } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { Label } from '@/app/shared/components/ui/label'
import { cn } from '@/lib/utils'
import { DiceBearAvatar } from '@/components/dicebear-avatar'

type ChannelType = Exclude<ChatConversationType, 'DM'>

type CreateChannelDialogProps = {
  currentUserId: string
  onClose: () => void
  onCreate: (name: string, type: ChannelType, memberIds: string[]) => Promise<void>
  onLoadMembers: () => Promise<Member[]>
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
        setMembers(loadedMembers.filter(m => m.id !== currentUserId))
      })
      .catch(loadError => {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load members')
      })
      .finally(() => { if (active) setIsLoadingMembers(false) })
    return () => { active = false }
  }, [currentUserId, onLoadMembers])

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return members
    return members.filter(m =>
      m.displayName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.departmentName?.toLowerCase().includes(q)
    )
  }, [members, memberSearch])

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isCreating) return
    setIsCreating(true)
    setError(null)
    try {
      await onCreate(name.trim(), type, selectedMemberIds)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04]">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Create channel</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Give your team a shared space</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
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
                onChange={e => setName(e.target.value)}
                placeholder="project-launch"
                autoFocus
                disabled={isCreating}
                className="mt-2 h-9 rounded-xl focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent/60"
              />
            </div>

            <div>
              <Label>Channel type</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {([
                  { value: 'PUBLIC_CHANNEL', Icon: Hash, label: 'Public', desc: 'Visible to everyone in the workspace.' },
                  { value: 'PRIVATE_CHANNEL', Icon: Lock, label: 'Private', desc: 'Only invited members can access.' },
                ] as const).map(({ value, Icon, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    disabled={isCreating}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-all duration-150 active:scale-[0.98]',
                      type === value
                        ? 'border-accent/40 bg-accent/[0.08]'
                        : 'border-border bg-transparent hover:border-border/80 hover:bg-popup-hover'
                    )}
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon className={cn('h-4 w-4', type === value ? 'text-accent-txt' : 'text-muted-foreground')} />
                      {label}
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Invite members</Label>
                <span className="text-xs text-muted-foreground">{selectedMemberIds.length} selected</span>
              </div>
              <div className="rounded-xl border border-border">
                <div className="relative border-b border-border">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Search members"
                    disabled={isCreating || isLoadingMembers}
                    className="h-9 border-0 bg-transparent pl-9 focus-visible:ring-0"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto p-1.5">
                  {isLoadingMembers ? (
                    <div className="flex justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">No members found</p>
                  ) : (
                    filteredMembers.map(member => {
                      const selected = selectedMemberIds.includes(member.id)
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleMember(member.id)}
                          disabled={isCreating}
                          className={cn(
                            'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-150',
                            selected ? 'bg-accent/[0.08]' : 'hover:bg-popup-hover hover:translate-x-0.5'
                          )}
                        >
                          <DiceBearAvatar
                            seed={member.id}
                            name={member.displayName}
                            className="h-7 w-7 rounded-md transition-transform duration-150 group-hover:scale-105"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-foreground">{member.displayName}</div>
                            <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                          </div>
                          <div className={cn(
                            'h-4 w-4 rounded border transition-all duration-150',
                            selected ? 'border-accent bg-accent scale-100' : 'border-border scale-95'
                          )} />
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating} className="active:scale-[0.97]">
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create channel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
