import { api } from './client'
import type {
  CreateRoomInput,
  GenerateLiveKitTokenResponse,
  MeetingNote,
  OfficeRoom,
  UpdateRoomInput,
} from '../types/office'

export const officeApi = {
  listRooms: async (token: string): Promise<OfficeRoom[]> => {
    return api.post('office/rooms/list', { token, body: {} })
  },

  createRoom: async (token: string, input: CreateRoomInput): Promise<OfficeRoom> => {
    return api.post('office/rooms', { token, body: input })
  },

  updateRoom: async (token: string, roomId: string, input: UpdateRoomInput): Promise<OfficeRoom> => {
    return api.patch(`office/rooms/${roomId}`, { token, body: input })
  },

  deleteRoom: async (token: string, roomId: string): Promise<{ deleted: boolean }> => {
    return api.delete(`office/rooms/${roomId}`, { token })
  },

  joinRoom: async (token: string, roomId: string): Promise<OfficeRoom> => {
    return api.post(`office/rooms/${roomId}/join`, { token, body: {} })
  },

  leaveRoom: async (token: string, roomId: string): Promise<{ left: boolean }> => {
    return api.post(`office/rooms/${roomId}/leave`, { token, body: {} })
  },

  getMeetingNote: async (token: string, roomId: string): Promise<MeetingNote | null> => {
    return api.get(`office/rooms/${roomId}/note`, { token })
  },

  updateMeetingNote: async (
    token: string,
    roomId: string,
    contentMarkdown: string,
  ): Promise<MeetingNote> => {
    return api.patch(`office/rooms/${roomId}/note`, { token, body: { contentMarkdown } })
  },

  generateLiveKitToken: async (
    token: string,
    roomId: string,
  ): Promise<GenerateLiveKitTokenResponse> => {
    return api.post(`office/rooms/${roomId}/token`, { token, body: {} })
  },
}
