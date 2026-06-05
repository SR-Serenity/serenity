'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-brand-surface border border-brand-border rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Create a Room</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-brand-muted text-xs mb-1.5 block">Room name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Weekly All-Hands"
              maxLength={80}
              autoFocus
            />
          </div>

          <div>
            <Label className="text-brand-muted text-xs mb-1.5 block">Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {ROOM_ICONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors',
                    icon === emoji
                      ? 'bg-brand text-white ring-2 ring-brand'
                      : 'bg-white/5 hover:bg-white/10',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-brand-muted text-xs mb-1.5 block">Room type</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROOM_TYPES.map(rt => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setType(rt.value)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-colors',
                    type === rt.value
                      ? 'border-brand bg-brand/10 text-white'
                      : 'border-brand-border bg-white/5 hover:bg-white/10 text-brand-muted',
                  )}
                >
                  <div className="text-sm font-medium">{rt.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{rt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-brand-muted text-xs mb-1.5 block">
              Max capacity: {maxCapacity}
            </Label>
            <input
              type="range"
              min={1}
              max={50}
              value={maxCapacity}
              onChange={e => setMaxCapacity(Number(e.target.value))}
              className="w-full accent-brand"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading} className="flex-1">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Room'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
