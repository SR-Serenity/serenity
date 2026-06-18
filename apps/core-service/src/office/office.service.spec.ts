import { WorkspaceRole } from '@prisma/client';
import { OfficeService } from './office.service';
import { OfficeRealtimeEvent } from '../realtime/config/enums/office-realtime-event.enum';

const auth = {
  userId: 'user-1',
  orgId: 'org-1',
  role: WorkspaceRole.MEMBER,
};

function createService() {
  const prisma = {
    officeRoom: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    officeRoomParticipant: {
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    meetingNote: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const events = {
    publish: jest.fn(),
  };

  return {
    prisma,
    events,
    service: new OfficeService(prisma as never, events as never),
  };
}

describe('OfficeService', () => {
  it('ends the last participant session without clearing meeting note content or exporting to wiki', async () => {
    const { prisma, events, service } = createService();
    const fetchMock = jest.fn();
    const previousFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    const room = {
      id: 'room-1',
      orgId: 'org-1',
      deletedAt: null,
    };
    prisma.officeRoom.findFirst.mockResolvedValue(room);
    prisma.officeRoom.findUnique.mockResolvedValue({ ...room, participants: [] });
    prisma.officeRoomParticipant.count.mockResolvedValue(0);
    prisma.meetingNote.findFirst.mockResolvedValue({
      id: 'note-1',
      roomId: 'room-1',
      orgId: 'org-1',
      contentMarkdown: '## Meeting Summary\n\n- Keep this note',
      sessionEndAt: null,
    });
    prisma.meetingNote.updateMany.mockResolvedValue({ count: 1 });

    try {
      await service.leaveRoom(auth, 'room-1');
    } finally {
      global.fetch = previousFetch;
    }

    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.meetingNote.updateMany).toHaveBeenCalledWith({
      where: { roomId: 'room-1', sessionEndAt: null },
      data: { sessionEndAt: expect.any(Date) },
    });
    expect(events.publish).toHaveBeenCalledWith({
      event: OfficeRealtimeEvent.PARTICIPANT_LEFT,
      orgId: 'org-1',
      roomId: 'room-1',
      payload: {
        roomId: 'room-1',
        userId: 'user-1',
        room: { ...room, participants: [] },
      },
    });
  });

  it('merges live transcript and AI blocks without duplicating markers', () => {
    const { service } = createService();
    const helpers = service as unknown as {
      appendLiveTranscriptLine: (content: string, line: string) => string;
      mergeAiNotesBlock: (content: string, aiBlock: string) => string;
    };

    let content = helpers.appendLiveTranscriptLine('', '- 00:01 Huy: First line');
    content = helpers.appendLiveTranscriptLine(content, '- 00:02 Linh: Second line');
    content = helpers.mergeAiNotesBlock(
      content,
      '<!-- serenity-ai-meeting-notes-start -->\n## Meeting Summary\n\n- First pass\n<!-- serenity-ai-meeting-notes-end -->',
    );
    content = helpers.mergeAiNotesBlock(
      content,
      '<!-- serenity-ai-meeting-notes-start -->\n## Meeting Summary\n\n- Updated pass\n<!-- serenity-ai-meeting-notes-end -->',
    );

    expect(content.match(/serenity-live-meeting-start/g)).toHaveLength(1);
    expect(content.match(/serenity-live-meeting-end/g)).toHaveLength(1);
    expect(content.match(/serenity-ai-meeting-notes-start/g)).toHaveLength(1);
    expect(content.match(/serenity-ai-meeting-notes-end/g)).toHaveLength(1);
    expect(content).toContain('- 00:01 Huy: First line');
    expect(content).toContain('- 00:02 Linh: Second line');
    expect(content).toContain('- Updated pass');
    expect(content).not.toContain('- First pass');
  });
});
