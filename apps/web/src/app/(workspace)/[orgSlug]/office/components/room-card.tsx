'use client'

import { useRouter, useParams } from 'next/navigation'
import { Trash2, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OfficeRoom, OfficeParticipant } from '@serenity/api'

const AVATAR_COLORS = [
  'bg-blue-400',
  'bg-violet-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-cyan-400',
  'bg-pink-400',
  'bg-teal-400',
]

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?'
}

// ── Video Slot ──────────────────────────────────────────────────────────────

function VideoSlot({
  participant,
  index,
}: {
  participant?: OfficeParticipant
  index: number
}) {
  return (
    <div
      className={cn(
        'aspect-video rounded-md flex items-center justify-center overflow-hidden',
        'bg-[var(--theme-button-default)]',
      )}
    >
      {participant && (
        <div
          className={cn(
            'w-full h-full flex items-center justify-center text-[10px] font-bold text-white',
            AVATAR_COLORS[index % AVATAR_COLORS.length],
          )}
        >
          {initials(participant.user.displayName)}
        </div>
      )}
    </div>
  )
}

// ── Small Room Card (personal desk) ─────────────────────────────────────────

export function SmallRoomCard({
  room,
  canDelete,
  onDelete,
}: {
  room: OfficeRoom
  canDelete: boolean
  onDelete: (id: string) => void
}) {
  const router = useRouter()
  const params = useParams<{ orgSlug: string }>()
  const slots = Array.from({ length: 4 }, (_, i) => room.participants[i])

  return (
    <div
      onClick={() => router.push(`/${params.orgSlug}/office/${room.id}`)}
      className={cn(
        'group bg-panel rounded-xl border border-(--theme-divider-color) p-3 cursor-pointer',
        'hover:shadow-md hover:border-(--theme-list-divider-color) transition-all duration-150',
        'select-none',
      )}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] font-medium text-caption truncate max-w-[120px]">
          {room.name}
        </span>
        <div className="flex items-center gap-0.5">
          {canDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(room.id) }}
              className="p-1 rounded hover:bg-[var(--highlight-hover)] text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1">
        {slots.map((p, i) => (
          <VideoSlot key={i} participant={p} index={i} />
        ))}
      </div>
    </div>
  )
}

// ── Large Room Card (meeting room) ───────────────────────────────────────────

export function LargeRoomCard({
  room,
  canDelete,
  onDelete,
}: {
  room: OfficeRoom
  canDelete: boolean
  onDelete: (id: string) => void
}) {
  const router = useRouter()
  const params = useParams<{ orgSlug: string }>()
  const isLive = room.participants.length > 0

  const cols = 5
  const rows = 3
  const totalSlots = cols * rows
  const slots = Array.from({ length: totalSlots }, (_, i) => room.participants[i])

  return (
    <div
      onClick={() => router.push(`/${params.orgSlug}/office/${room.id}`)}
      className={cn(
        'group bg-panel rounded-xl border border-(--theme-divider-color) p-3 cursor-pointer',
        'hover:shadow-md hover:border-(--theme-list-divider-color) transition-all duration-150',
        'select-none',
      )}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] font-medium text-caption truncate">
          {room.name}
        </span>
        <div className="flex items-center gap-1">
          {isLive && (
            <Video className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          )}
          <div className="flex items-center gap-0.5">
            {canDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(room.id) }}
                className="p-1 rounded hover:bg-[var(--highlight-hover)] text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {slots.map((p, i) => (
          <VideoSlot key={i} participant={p} index={i} />
        ))}
      </div>
    </div>
  )
}
