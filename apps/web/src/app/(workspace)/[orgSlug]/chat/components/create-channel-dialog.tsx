'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { ChatConversationType } from '@serenity/api'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { Label } from '@/app/shared/components/ui/label'
import { cn } from '@/lib/utils'

type CreateChannelDialogProps = {
  onClose: () => void
  onCreate: (name: string, type: Exclude<ChatConversationType, 'DM'>) => Promise<void>
}

export function CreateChannelDialog({ onClose, onCreate }: CreateChannelDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<Exclude<ChatConversationType, 'DM'>>('PUBLIC_CHANNEL')
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isCreating) return

    setIsCreating(true)
    try {
      await onCreate(name.trim(), type)
      onClose()
    } catch (error) {
      console.error('Failed to create channel:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-divider bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-caption">Create Channel</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="channel-name">Channel Name</Label>
            <Input
              id="channel-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. general, random, announcements"
              autoFocus
              disabled={isCreating}
            />
          </div>

          <div>
            <Label>Channel Type</Label>
            <div className="mt-2 space-y-2">
              <button
                type="button"
                onClick={() => setType('PUBLIC_CHANNEL')}
                disabled={isCreating}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  type === 'PUBLIC_CHANNEL'
                    ? 'border-accent bg-accent/10'
                    : 'border-divider hover:bg-hover'
                )}
              >
                <div className="font-semibold text-caption">Public</div>
                <div className="text-sm text-muted">Anyone in the workspace can join</div>
              </button>
              <button
                type="button"
                onClick={() => setType('PRIVATE_CHANNEL')}
                disabled={isCreating}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  type === 'PRIVATE_CHANNEL'
                    ? 'border-accent bg-accent/10'
                    : 'border-divider hover:bg-hover'
                )}
              >
                <div className="font-semibold text-caption">Private</div>
                <div className="text-sm text-muted">Only invited members can join</div>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
