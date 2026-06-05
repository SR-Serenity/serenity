'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

type RoomQuickType = {
  label: string
  icon: string
  description: string
}

const ROOM_QUICK_TYPES: RoomQuickType[] = [
  { label: 'Meeting room', icon: '📋', description: 'Collaborative meeting space' },
  { label: 'Team room', icon: '🚀', description: 'Persistent team hangout' },
  { label: 'Office', icon: '🏢', description: 'Personal desk space' },
  { label: 'Voice room', icon: '🔊', description: 'Audio-only space' },
]

type RoomTypePickerProps = {
  onSelect: (type: RoomQuickType['label']) => void
  onClose: () => void
}

export function RoomTypePicker({ onSelect, onClose }: RoomTypePickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onClose])

  return (
    <div
      ref={ref}
      className={cn(
        'absolute top-full right-0 mt-1.5 z-50',
        'bg-panel border border-(--theme-divider-color) rounded-xl shadow-lg',
        'flex items-center gap-1 p-1.5',
      )}
    >
      {ROOM_QUICK_TYPES.map((rt) => (
        <button
          key={rt.label}
          onClick={() => onSelect(rt.label)}
          title={rt.description}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
            'text-caption hover:bg-[var(--highlight-hover)] transition-colors whitespace-nowrap',
          )}
        >
          {rt.label}
        </button>
      ))}
    </div>
  )
}
