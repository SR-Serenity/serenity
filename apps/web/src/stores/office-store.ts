'use client'

import { create } from 'zustand'
import { officeApi } from '@serenity/api'
import type { CreateRoomInput, MeetingNote, OfficeRoom, UpdateRoomInput } from '@serenity/api'

const NOTE_DEBOUNCE_MS = 600

type OfficeStore = {
  rooms: OfficeRoom[]
  activeRoomId: string | null
  meetingNote: MeetingNote | null
  livekitToken: string | null
  livekitWsUrl: string
  isLoadingRooms: boolean
  roomError: string | null

  loadRooms: (token: string) => Promise<void>
  createRoom: (token: string, input: CreateRoomInput) => Promise<OfficeRoom>
  updateRoom: (token: string, roomId: string, input: UpdateRoomInput) => Promise<void>
  deleteRoom: (token: string, roomId: string) => Promise<void>
  joinRoom: (token: string, roomId: string) => Promise<void>
  leaveRoom: (token: string, roomId: string) => Promise<void>
  loadMeetingNote: (token: string, roomId: string) => Promise<void>
  updateMeetingNote: (token: string, roomId: string, content: string) => void
  applyRealtimeEvent: (event: { type?: string; event?: string; payload?: unknown }) => void
  reset: () => void
}

let noteDebounceTimer: ReturnType<typeof setTimeout> | null = null

export const useOfficeStore = create<OfficeStore>((set, get) => ({
  rooms: [],
  activeRoomId: null,
  meetingNote: null,
  livekitToken: null,
  livekitWsUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL ?? 'ws://localhost:7880',
  isLoadingRooms: false,
  roomError: null,

  loadRooms: async (token) => {
    set({ isLoadingRooms: true, roomError: null })
    try {
      const rooms = await officeApi.listRooms(token)
      set({ rooms, isLoadingRooms: false })
    } catch {
      set({ isLoadingRooms: false, roomError: 'Failed to load rooms' })
    }
  },

  createRoom: async (token, input) => {
    const room = await officeApi.createRoom(token, input)
    set(s => ({ rooms: [...s.rooms, room] }))
    return room
  },

  updateRoom: async (token, roomId, input) => {
    const updated = await officeApi.updateRoom(token, roomId, input)
    set(s => ({ rooms: s.rooms.map(r => (r.id === roomId ? updated : r)) }))
  },

  deleteRoom: async (token, roomId) => {
    await officeApi.deleteRoom(token, roomId)
    set(s => ({ rooms: s.rooms.filter(r => r.id !== roomId) }))
  },

  joinRoom: async (token, roomId) => {
    const [room, lkData] = await Promise.all([
      officeApi.joinRoom(token, roomId),
      officeApi.generateLiveKitToken(token, roomId),
    ])
    set(s => ({
      activeRoomId: roomId,
      livekitToken: lkData.token,
      livekitWsUrl: lkData.wsUrl,
      rooms: s.rooms.map(r => (r.id === roomId ? room : r)),
    }))
  },

  leaveRoom: async (token, roomId) => {
    await officeApi.leaveRoom(token, roomId)
    set({ activeRoomId: null, livekitToken: null, meetingNote: null })
  },

  loadMeetingNote: async (token, roomId) => {
    const note = await officeApi.getMeetingNote(token, roomId)
    set({ meetingNote: note })
  },

  updateMeetingNote: (token, roomId, content) => {
    set(s => ({
      meetingNote: s.meetingNote ? { ...s.meetingNote, contentMarkdown: content } : null,
    }))
    if (noteDebounceTimer) clearTimeout(noteDebounceTimer)
    noteDebounceTimer = setTimeout(() => {
      void officeApi.updateMeetingNote(token, roomId, content)
    }, NOTE_DEBOUNCE_MS)
  },

  applyRealtimeEvent: (event) => {
    const type = event.type ?? event.event
    const payload = event.payload
    if (!type) {
      return
    }

    switch (type) {
      case 'office.room.created': {
        const room = payload as OfficeRoom
        set(s => ({
          rooms: s.rooms.some(r => r.id === room.id)
            ? s.rooms
            : [...s.rooms, room],
        }))
        break
      }
      case 'office.room.updated': {
        const room = payload as OfficeRoom
        set(s => ({ rooms: s.rooms.map(r => (r.id === room.id ? room : r)) }))
        break
      }
      case 'office.room.deleted': {
        const { roomId } = payload as { roomId: string }
        set(s => ({ rooms: s.rooms.filter(r => r.id !== roomId) }))
        break
      }
      case 'office.participant.joined':
      case 'office.participant.left': {
        const { room } = payload as { room: OfficeRoom }
        if (room) {
          set(s => ({ rooms: s.rooms.map(r => (r.id === room.id ? room : r)) }))
        }
        break
      }
      case 'office.note.updated': {
        const note = payload as MeetingNote
        if (get().activeRoomId === note.roomId) {
          set({ meetingNote: note })
        }
        break
      }
    }
  },

  reset: () => {
    if (noteDebounceTimer) clearTimeout(noteDebounceTimer)
    set({
      rooms: [],
      activeRoomId: null,
      meetingNote: null,
      livekitToken: null,
      isLoadingRooms: false,
      roomError: null,
    })
  },
}))
