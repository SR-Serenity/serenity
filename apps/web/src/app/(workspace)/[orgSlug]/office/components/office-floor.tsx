'use client'

import { SmallRoomCard, LargeRoomCard } from './room-card'
import type { OfficeRoom } from '@serenity/api'

function isLargeRoom(room: OfficeRoom) {
  return room.maxCapacity > 6 || room.type === 'SOCIAL' || room.type === 'PRIVATE'
}

type OfficeFloorProps = {
  rooms: OfficeRoom[]
  canManage: boolean
  isEditing: boolean
  onDelete: (roomId: string) => void
}

export function OfficeFloor({ rooms, canManage, isEditing, onDelete }: OfficeFloorProps) {
  const deskRooms = rooms.filter(r => !isLargeRoom(r))
  const meetingRooms = rooms.filter(r => isLargeRoom(r))

  if (rooms.length === 0) {
    return null
  }

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Left panel — personal desks */}
      {deskRooms.length > 0 && (
        <div className="shrink-0 w-85">
          <div className="grid grid-cols-2 gap-3">
            {deskRooms.map(room => (
              <SmallRoomCard
                key={room.id}
                room={room}
                canDelete={canManage && isEditing}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Right panel — meeting rooms */}
      {meetingRooms.length > 0 && (
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 gap-3">
            {meetingRooms.map(room => (
              <LargeRoomCard
                key={room.id}
                room={room}
                canDelete={canManage && isEditing}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
