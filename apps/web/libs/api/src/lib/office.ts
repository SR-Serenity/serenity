import { api } from './client'
import type {
  CreateRoomInput,
  GenerateLiveKitTokenResponse,
  LiveTranscriptionStatus,
  MeetingNote,
  OfficeRoom,
  SummarizeMeetingNoteResponse,
  TranscribeMeetingRecordingInput,
  TranscribeMeetingRecordingResponse,
  UpdateRoomInput,
} from '../types/office'

export const officeApi = {
  listRooms: async (token: string): Promise<OfficeRoom[]> => {
    return api.post('office/rooms/list', { token, body: {} })
  },

  createRoom: async (token: string, input: CreateRoomInput): Promise<OfficeRoom> => {
    return api.post('office/rooms', { token, body: input })
  },

  updateRoom: async (
    token: string,
    roomId: string,
    input: UpdateRoomInput,
  ): Promise<OfficeRoom> => {
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

  summarizeMeetingNote: async (
    token: string,
    roomId: string,
    transcriptMarkdown: string,
  ): Promise<SummarizeMeetingNoteResponse> => {
    return api.post(`office/rooms/${roomId}/note/summarize`, {
      token,
      body: { transcriptMarkdown },
    })
  },

  transcribeMeetingRecording: async (
    token: string,
    roomId: string,
    input: TranscribeMeetingRecordingInput,
  ): Promise<TranscribeMeetingRecordingResponse> => {
    return api.post(`office/rooms/${roomId}/note/transcribe`, {
      token,
      body: input,
    })
  },

  startLiveTranscription: async (
    token: string,
    roomId: string,
  ): Promise<LiveTranscriptionStatus> => {
    return api.post(`office/rooms/${roomId}/live-transcription/start`, {
      token,
      body: {},
    })
  },

  stopLiveTranscription: async (
    token: string,
    roomId: string,
  ): Promise<LiveTranscriptionStatus> => {
    return api.post(`office/rooms/${roomId}/live-transcription/stop`, {
      token,
      body: {},
    })
  },

  generateLiveKitToken: async (
    token: string,
    roomId: string,
  ): Promise<GenerateLiveKitTokenResponse> => {
    return api.post(`office/rooms/${roomId}/token`, { token, body: {} })
  },
}
