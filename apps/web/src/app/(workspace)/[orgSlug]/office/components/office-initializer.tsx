'use client'

import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/auth-store'
import { useOfficeStore } from '@/stores/office-store'
import { useRealtime } from '@/hooks/use-realtime'

export function OfficeInitializer() {
  const { token } = useAuthStore(useShallow(state => ({ token: state.token })))
  const { loadRooms, applyRealtimeEvent, reset } = useOfficeStore(
    useShallow(state => ({
      loadRooms: state.loadRooms,
      applyRealtimeEvent: state.applyRealtimeEvent,
      reset: state.reset,
    })),
  )

  const { subscribe } = useRealtime(token, !!token)

  useEffect(() => {
    return () => reset()
  }, [reset])

  useEffect(() => {
    if (!token) return
    void loadRooms(token)
  }, [token, loadRooms])

  useEffect(() => {
    const events = [
      'office.room.created',
      'office.room.updated',
      'office.room.deleted',
      'office.participant.joined',
      'office.participant.left',
      'office.note.updated',
    ]
    const unsubs = events.map(eventType =>
      subscribe(eventType, (data) => {
        applyRealtimeEvent(data as { type: string; payload?: unknown })
      }),
    )
    return () => unsubs.forEach(unsub => unsub())
  }, [subscribe, applyRealtimeEvent])

  return null
}
