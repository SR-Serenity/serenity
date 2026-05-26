'use client'

import { useState, useRef } from 'react'
import { Plus, Loader2, Building2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/auth-store'
import { useOfficeStore } from '@/stores/office-store'
import { Button } from '@/app/shared/components/ui/button'
import { OfficeFloor } from './components/office-floor'
import { RoomTypePicker } from './components/room-type-picker'

type QuickRoomLabel = 'Meeting room' | 'Team room' | 'Office' | 'Voice room'

function buildRoomInput(label: QuickRoomLabel, existingNames: string[]) {
  const countOf = (keyword: string) =>
    existingNames.filter((n) => n.toLowerCase().startsWith(keyword.toLowerCase())).length

  switch (label) {
    case 'Meeting room': {
      const n = countOf('Meeting Room') + 1
      return { name: `Meeting Room ${n}`, type: 'OPEN' as const, icon: '📋', maxCapacity: 20 }
    }
    case 'Team room': {
      const n = countOf('Team Room') + 1
      return { name: `Team Room ${n}`, type: 'SOCIAL' as const, icon: '🚀', maxCapacity: 12 }
    }
    case 'Office':
      return { name: 'Office', type: 'FOCUS' as const, icon: '🏢', maxCapacity: 2 }
    case 'Voice room': {
      const n = countOf('Voice Room') + 1
      return { name: `Voice Room ${n}`, type: 'OPEN' as const, icon: '🔊', maxCapacity: 10 }
    }
  }
}

export default function OfficePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const addBtnRef = useRef<HTMLDivElement>(null)

  const { token, role, orgName } = useAuthStore(
    useShallow((state) => ({
      token: state.token,
      role: state.currentOrg?.role,
      orgName: state.currentOrg?.name,
    })),
  )
  const { rooms, isLoadingRooms, createRoom, deleteRoom } = useOfficeStore(
    useShallow((state) => ({
      rooms: state.rooms,
      isLoadingRooms: state.isLoadingRooms,
      createRoom: state.createRoom,
      deleteRoom: state.deleteRoom,
    })),
  )

  const canManage = role === 'OWNER' || role === 'ADMIN'

  const handleAddClick = () => {
    setIsEditing(true)
    setShowTypePicker((prev) => !prev)
  }

  const handleTypeSelect = async (label: string) => {
    if (!token) return
    setShowTypePicker(false)
    const input = buildRoomInput(label as QuickRoomLabel, rooms.map((r) => r.name))
    await createRoom(token, input)
  }

  const handleDelete = async (roomId: string) => {
    if (!token) return
    if (!confirm('Delete this room?')) return
    await deleteRoom(token, roomId)
  }

  const handleDone = () => {
    setIsEditing(false)
    setShowTypePicker(false)
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-(--theme-divider-color)">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted" />
          <span className="text-sm font-medium text-caption">
            {orgName ?? 'Main'}
          </span>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {/* "+" add button with type picker */}
            <div ref={addBtnRef} className="relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAddClick}
                className="h-7 w-7 p-0"
                title="Add room"
              >
                <Plus className="h-4 w-4" />
              </Button>

              {showTypePicker && (
                <RoomTypePicker
                  onSelect={handleTypeSelect}
                  onClose={() => setShowTypePicker(false)}
                />
              )}
            </div>

            {/* Done button — visible when in edit mode */}
            {isEditing && (
              <Button
                size="sm"
                onClick={handleDone}
                className="h-7 px-3 text-xs bg-brand text-white hover:bg-brand-hover"
              >
                Done
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Floor canvas */}
      <div className="flex-1 overflow-auto p-5">
        {isLoadingRooms ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : (
          <OfficeFloor
            rooms={rooms}
            canManage={canManage}
            isEditing={isEditing}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  )
}
