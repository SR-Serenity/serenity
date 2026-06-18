import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { officeApi, wikiApi } from '@serenity/api'
import { useAuthStore } from '../src/stores/auth-store'
import { useOfficeStore } from '../src/stores/office-store'
import { MeetingNotesPanel } from '../src/app/(workspace)/[orgSlug]/office/[roomId]/components/meeting-notes-panel'
import type { MeetingNote, OfficeRoom } from '@serenity/api'

const push = jest.fn()

jest.mock('next/navigation', () => ({
  useParams: () => ({ orgSlug: 'serenity' }),
  useRouter: () => ({ push }),
}))

jest.mock('react-markdown', () => {
  const React = jest.requireActual<typeof import('react')>('react')
  return {
    __esModule: true,
    default: ({ children }: { children: string }) => React.createElement('div', null, children),
  }
})

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: jest.fn(),
}))

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
    startLiveTranscription: jest.fn(),
    stopLiveTranscription: jest.fn(),
    summarizeMeetingNote: jest.fn(),
  },
  wikiApi: {
    createPage: jest.fn(),
  },
}))

const note: MeetingNote = {
  id: 'note-1',
  roomId: 'room-1',
  orgId: 'org-1',
  sessionStartAt: '2026-06-18T09:30:00.000Z',
  sessionEndAt: null,
  createdAt: '2026-06-18T09:30:00.000Z',
  updatedAt: '2026-06-18T09:35:00.000Z',
  contentMarkdown: [
    '<!-- serenity-live-meeting-start -->',
    '## Live transcript',
    '- 00:01 Huy: We decided to launch on Friday.',
    '<!-- serenity-live-meeting-end -->',
    '<!-- serenity-ai-meeting-notes-start -->',
    '## Meeting Summary',
    '',
    '- Launch is on track.',
    '',
    '## Action Items',
    '',
    '- [ ] Huy follows up with QA.',
    '<!-- serenity-ai-meeting-notes-end -->',
  ].join('\n'),
}

const room: OfficeRoom = {
  id: 'room-1',
  orgId: 'org-1',
  name: 'Design Review',
  type: 'OPEN',
  icon: null,
  maxCapacity: 20,
  position: null,
  createdById: 'user-1',
  deletedAt: null,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
  participants: [],
}

beforeEach(() => {
  jest.resetAllMocks()
  push.mockReset()
  useOfficeStore.getState().reset()
  useOfficeStore.setState({
    activeRoomId: 'room-1',
    meetingNote: note,
    rooms: [room],
  })
  useAuthStore.setState({
    token: 'token',
    user: null,
    currentOrg: null,
    initializing: false,
  })
  jest.mocked(officeApi.getMeetingNote).mockResolvedValue(note)
  jest.mocked(wikiApi.createPage).mockResolvedValue({
    id: 'page-1',
    title: 'Meeting: Design Review - 2026-06-18',
  } as never)
})

function renderPanel() {
  return render(
    <MeetingNotesPanel
      roomId="room-1"
      isOpen
      onToggle={jest.fn()}
      captionState="idle"
      isGeneratingNotes={false}
      meetingError={null}
      onRegenerateNotes={jest.fn()}
    />,
  )
}

it('renders AI notes without a transcript feed tab', () => {
  renderPanel()

  expect(screen.getByText('AI Notes')).toBeTruthy()
  expect(screen.getByText(content => content.includes('Launch is on track.'))).toBeTruthy()
  expect(screen.getByText(content => content.includes('Huy follows up with QA.'))).toBeTruthy()
  expect(screen.queryByText('Transcript')).toBeNull()
})

it('exports AI notes to wiki and navigates to the new page', async () => {
  renderPanel()

  fireEvent.click(screen.getByTitle('Export to wiki'))

  await waitFor(() => {
    expect(wikiApi.createPage).toHaveBeenCalled()
  })

  expect(wikiApi.createPage).toHaveBeenCalledWith(
    'token',
    expect.objectContaining({
      title: 'Meeting: Design Review - 2026-06-18',
      contentMarkdown: expect.stringContaining('## Meeting Summary'),
      visibility: 'WORKSPACE',
    }),
  )
  expect(wikiApi.createPage).toHaveBeenCalledWith(
    'token',
    expect.not.objectContaining({
      contentMarkdown: expect.stringContaining('## Live transcript'),
    }),
  )
  expect(push).toHaveBeenCalledWith('/serenity/wiki/page-1')
})
