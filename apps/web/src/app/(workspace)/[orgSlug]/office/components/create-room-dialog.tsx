'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { Label } from '@/app/shared/components/ui/label'
import { cn } from '@/lib/utils'
import type { OfficeRoomType, OfficeRoom, CreateRoomInput } from '@serenity/api'

const ROOM_TYPES: { value: OfficeRoomType; label: string; desc: string }[] = [
  { value: 'OPEN', label: 'Open', desc: 'Anyone can join freely' },
  { value: 'PRIVATE', label: 'Private', desc: 'Invitation only' },
  { value: 'FOCUS', label: 'Focus', desc: 'Low-interruption work area' },
  { value: 'SOCIAL', label: 'Social', desc: 'Casual hangout space' },
]

const ROOM_ICONS = ['🏢', '🎯', '☕', '🚀', '💡', '🎉', '📋', '🔬']

type CreateRoomDialogProps = {
  onClose: () => void
  onCreate: (input: CreateRoomInput) => Promise<OfficeRoom>
}

export function CreateRoomDialog({ onClose, onCreate }: CreateRoomDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<OfficeRoomType>('OPEN')
  const [icon, setIcon] = useState('🏢')
  const [maxCapacity, setMaxCapacity] = useState(20)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setIsLoading(true)
    setError('')
    try {
      await onCreate({ name: name.trim(), type, icon, maxCapacity })
      onClose()
    } catch {
      setError('Failed to create room. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04]">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">Create a Room</h2>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Room name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Weekly All-Hands"
                maxLength={80}
                autoFocus
                className="mt-1.5 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent/60"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Icon</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ROOM_ICONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all duration-150 active:scale-95',
                      icon === emoji
                        ? 'bg-accent/20 ring-1 ring-accent/50'
                        : 'bg-popup-hover hover:bg-accent/10',
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Room type</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {ROOM_TYPES.map(rt => (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setType(rt.value)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all duration-150 active:scale-[0.98]',
                      type === rt.value
                        ? 'border-accent/40 bg-accent/[0.08] text-foreground'
                        : 'border-border bg-transparent hover:border-border/80 hover:bg-popup-hover text-muted-foreground',
                    )}
                  >
                    <div className="text-sm font-medium">{rt.label}</div>
                    <div className="mt-0.5 text-xs opacity-70">{rt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                Max capacity: <span className="text-foreground font-medium">{maxCapacity}</span>
              </Label>
              <input
                type="range"
                min={1}
                max={50}
                value={maxCapacity}
                onChange={e => setMaxCapacity(Number(e.target.value))}
                className="mt-1.5 w-full accent-[var(--global-accent-BackgroundColor)]"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isLoading} className="flex-1 active:scale-[0.97]">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Room'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
