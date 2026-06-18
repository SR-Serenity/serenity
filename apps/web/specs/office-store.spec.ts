import type { MeetingNote } from '@serenity/api'
import { useOfficeStore } from '../src/stores/office-store'

jest.mock('@serenity/api', () => ({
  officeApi: {
    listRooms: jest.fn(),
    createRoom: jest.fn(),
    updateRoom: jest.fn(),
    deleteRoom: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    getMeetingNote: jest.fn(),
    updateMeetingNote: jest.fn(),
  },
}))

const note: MeetingNote = {
  id: 'note-1',
  roomId: 'room-1',
  orgId: 'org-1',
  contentMarkdown: '## Meeting Summary\n\n- Captured',
  sessionStartAt: '2026-06-18T00:00:00.000Z',
  sessionEndAt: null,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
}

beforeEach(() => {
  useOfficeStore.getState().reset()
})

it('applies office note realtime envelopes to the active meeting note', () => {
  useOfficeStore.setState({ activeRoomId: 'room-1' })

  useOfficeStore.getState().applyRealtimeEvent({
    type: 'office.note.updated',
    payload: note,
  })

  expect(useOfficeStore.getState().meetingNote).toEqual(note)
})

it('ignores note updates for inactive rooms', () => {
  useOfficeStore.setState({ activeRoomId: 'room-2' })

  useOfficeStore.getState().applyRealtimeEvent({
    event: 'office.note.updated',
    payload: note,
  })

  expect(useOfficeStore.getState().meetingNote).toBeNull()
})
