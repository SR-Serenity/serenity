'use client'

import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { Button } from '@/app/shared/components/ui/button'
import { Input } from '@/app/shared/components/ui/input'
import { Label } from '@/app/shared/components/ui/label'
import { cn } from '@/lib/utils'

type User = {
  id: string
  displayName: string
  email?: string
}

type CreateDmDialogProps = {
  currentUserId: string
  onClose: () => void
  onCreate: (memberIds: string[]) => Promise<void>
  onLoadUsers: () => Promise<User[]>
}

export function CreateDmDialog({
  currentUserId,
  onClose,
  onCreate,
  onLoadUsers,
}: CreateDmDialogProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const loadedUsers = await onLoadUsers()
      setUsers(loadedUsers.filter(u => u.id !== currentUserId))
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = users.filter(
    user =>
      user.displayName.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedUserIds.length === 0 || isCreating) return

    setIsCreating(true)
    try {
      await onCreate(selectedUserIds)
      onClose()
    } catch (error) {
      console.error('Failed to create DM:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-divider bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-caption">New Direct Message</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="user-search">Select People</Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="user-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-9"
                disabled={isLoading || isCreating}
              />
            </div>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto rounded border border-divider bg-panel p-2">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">No users found</div>
            ) : (
              filteredUsers.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user.id)}
                  disabled={isCreating}
                  className={cn(
                    'w-full rounded p-2 text-left transition-colors',
                    selectedUserIds.includes(user.id)
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-hover'
                  )}
                >
                  <div className="font-semibold text-sm">{user.displayName}</div>
                  {user.email && (
                    <div className="text-xs text-muted">{user.email}</div>
                  )}
                </button>
              ))
            )}
          </div>

          {selectedUserIds.length > 0 && (
            <div className="text-sm text-muted">
              {selectedUserIds.length} {selectedUserIds.length === 1 ? 'person' : 'people'} selected
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={selectedUserIds.length === 0 || isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
