export type OfficeRoomType = 'OPEN' | 'PRIVATE' | 'FOCUS' | 'SOCIAL'

export type OfficeParticipant = {
  id: string
  roomId: string
  userId: string
  joinedAt: string
  user: {
    id: string
    displayName: string
    email: string
  }
}

export type OfficeRoom = {
  id: string
  orgId: string
  name: string
  type: OfficeRoomType
  icon: string | null
  maxCapacity: number
  position: { x: number; y: number } | null
  createdById: string
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  participants: OfficeParticipant[]
}

export type MeetingNote = {
  id: string
  roomId: string
  orgId: string
  contentMarkdown: string
  sessionStartAt: string
  sessionEndAt: string | null
  createdAt: string
  updatedAt: string
}

export type MeetingNotesSummary = {
  summary: string[]
}

export type SummarizeMeetingNoteResponse = MeetingNotesSummary & {
  note: MeetingNote
}

export type MeetingTranscriptSegment = {
  text: string
  speaker: string | null
  start: number | null
  end: number | null
}

export type TranscribeMeetingRecordingInput = {
  audioUrl: string
  model?: string
  language?: string
  prompt?: string
}

export type TranscribeMeetingRecordingResponse = MeetingNotesSummary & {
  note: MeetingNote
  text: string
  transcriptMarkdown: string
  segments: MeetingTranscriptSegment[]
  model: string
}

export type LiveTranscriptionStatus = {
  roomId: string
  status: string
  model?: string
}

export type GenerateLiveKitTokenResponse = {
  token: string
  wsUrl: string
}

export type CreateRoomInput = {
  name: string
  type?: OfficeRoomType
  icon?: string
  maxCapacity?: number
  position?: { x: number; y: number }
}

export type UpdateRoomInput = {
  name?: string
  type?: OfficeRoomType
  icon?: string
  maxCapacity?: number
  position?: { x: number; y: number }
}
