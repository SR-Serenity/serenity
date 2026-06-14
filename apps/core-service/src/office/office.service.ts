import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { AccessToken } from 'livekit-server-sdk';
import { PrismaService } from '../database/prisma.service';
import { OfficeRealtimeEvent } from '../realtime/config/enums/office-realtime-event.enum';
import { WikiService } from '../wiki/wiki.service';
import { WikiPageVisibility } from '@prisma/client';
import { OfficeEventsService } from './office-events.service';
import type {
  CreateRoomDto,
  LiveTranscriptSegmentDto,
  StartLiveTranscriptionDto,
  SummarizeMeetingNoteDto,
  TranscribeMeetingRecordingDto,
  UpdateMeetingNoteDto,
  UpdateRoomDto,
} from './dto/office.dto';

type AuthContext = {
  userId: string;
  orgId: string;
  role: WorkspaceRole;
};

const userSelect = { id: true, email: true, displayName: true };

const roomInclude = {
  participants: {
    include: { user: { select: userSelect } },
    orderBy: { joinedAt: 'asc' as const },
  },
};

const AI_NOTES_BLOCK_START = '<!-- serenity-ai-meeting-notes-start -->';
const AI_NOTES_BLOCK_END = '<!-- serenity-ai-meeting-notes-end -->';
const LIVE_TRANSCRIPT_BLOCK_START = '<!-- serenity-live-meeting-start -->';
const LIVE_TRANSCRIPT_BLOCK_END = '<!-- serenity-live-meeting-end -->';
const FINAL_TRANSCRIPT_BLOCK_START = '<!-- serenity-final-transcript-start -->';
const FINAL_TRANSCRIPT_BLOCK_END = '<!-- serenity-final-transcript-end -->';
const LIVE_SUMMARY_INTERVAL_MS = 45_000;

type AiMeetingNotesResponse = {
  summary: string[];
  markdown: string;
};

type AiMeetingTranscriptionResponse = {
  text: string;
  transcriptMarkdown: string;
  segments: Array<{
    text: string;
    speaker: string | null;
    start: number | null;
    end: number | null;
  }>;
  model: string;
};

@Injectable()
export class OfficeService {
  private readonly logger = new Logger(OfficeService.name);
  private readonly liveSummaryAtByRoom = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OfficeEventsService,
    private readonly wiki: WikiService,
  ) {}

  async listRooms(auth: AuthContext) {
    const rooms = await this.prisma.officeRoom.findMany({
      where: { orgId: auth.orgId, deletedAt: null },
      include: roomInclude,
      orderBy: { createdAt: 'asc' },
    });
    if (rooms.length === 0) {
      return this.seedDefaultRooms(auth);
    }
    return rooms;
  }

  private async seedDefaultRooms(auth: AuthContext) {
    const defaults = [
      { name: 'All Hands', type: 'SOCIAL' as const, icon: '🎉', maxCapacity: 50 },
      { name: 'Meeting Room 1', type: 'OPEN' as const, icon: '📋', maxCapacity: 20 },
      { name: 'Meeting Room 2', type: 'OPEN' as const, icon: '📋', maxCapacity: 20 },
      { name: 'Voice Room 1', type: 'FOCUS' as const, icon: '🔊', maxCapacity: 10 },
      { name: 'Voice Room 2', type: 'FOCUS' as const, icon: '🔊', maxCapacity: 10 },
    ];
    const created = await this.prisma.$transaction(
      defaults.map((d) =>
        this.prisma.officeRoom.create({
          data: { orgId: auth.orgId, createdById: auth.userId, ...d },
          include: roomInclude,
        }),
      ),
    );
    return created;
  }

  async createRoom(auth: AuthContext, input: CreateRoomDto) {
    this.assertAdminOrOwner(auth.role);
    const room = await this.prisma.officeRoom.create({
      data: {
        orgId: auth.orgId,
        createdById: auth.userId,
        name: input.name,
        type: input.type ?? 'OPEN',
        icon: input.icon,
        maxCapacity: input.maxCapacity ?? 20,
        position: input.position as object | undefined,
      },
      include: roomInclude,
    });
    await this.events.publish({
      event: OfficeRealtimeEvent.ROOM_CREATED,
      orgId: auth.orgId,
      roomId: room.id,
      payload: room,
    });
    return room;
  }

  async updateRoom(auth: AuthContext, roomId: string, input: UpdateRoomDto) {
    const room = await this.findRoomOrThrow(roomId, auth.orgId);
    if (
      auth.role !== WorkspaceRole.OWNER &&
      auth.role !== WorkspaceRole.ADMIN &&
      room.createdById !== auth.userId
    ) {
      throw new ForbiddenException('Only admins or the room creator can update this room');
    }
    const updated = await this.prisma.officeRoom.update({
      where: { id: roomId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.icon !== undefined && { icon: input.icon }),
        ...(input.maxCapacity !== undefined && { maxCapacity: input.maxCapacity }),
        ...(input.position !== undefined && { position: input.position as object }),
      },
      include: roomInclude,
    });
    await this.events.publish({
      event: OfficeRealtimeEvent.ROOM_UPDATED,
      orgId: auth.orgId,
      roomId: room.id,
      payload: updated,
    });
    return updated;
  }

  async deleteRoom(auth: AuthContext, roomId: string) {
    this.assertAdminOrOwner(auth.role);
    await this.findRoomOrThrow(roomId, auth.orgId);
    await this.prisma.officeRoom.update({
      where: { id: roomId },
      data: { deletedAt: new Date() },
    });
    await this.events.publish({
      event: OfficeRealtimeEvent.ROOM_DELETED,
      orgId: auth.orgId,
      roomId,
      payload: { roomId },
    });
    return { deleted: true };
  }

  async joinRoom(auth: AuthContext, roomId: string) {
    const room = await this.findRoomOrThrow(roomId, auth.orgId);

    await this.prisma.officeRoomParticipant.upsert({
      where: { roomId_userId: { roomId, userId: auth.userId } },
      create: { roomId, userId: auth.userId },
      update: { joinedAt: new Date() },
    });

    const activeNote = await this.prisma.meetingNote.findFirst({
      where: { roomId, sessionEndAt: null },
    });
    if (!activeNote) {
      await this.prisma.meetingNote.create({
        data: { roomId, orgId: auth.orgId },
      });
    }

    const updatedRoom = await this.prisma.officeRoom.findUnique({
      where: { id: roomId },
      include: roomInclude,
    });

    await this.events.publish({
      event: OfficeRealtimeEvent.PARTICIPANT_JOINED,
      orgId: auth.orgId,
      roomId,
      payload: {
        roomId,
        userId: auth.userId,
        room: updatedRoom,
      },
    });

    return updatedRoom ?? room;
  }

  async leaveRoom(auth: AuthContext, roomId: string) {
    await this.findRoomOrThrow(roomId, auth.orgId);

    await this.prisma.officeRoomParticipant.deleteMany({
      where: { roomId, userId: auth.userId },
    });

    const remainingCount = await this.prisma.officeRoomParticipant.count({
      where: { roomId },
    });

    if (remainingCount === 0) {
      const note = await this.prisma.meetingNote.findFirst({
        where: { roomId, sessionEndAt: null },
        orderBy: { sessionStartAt: 'desc' },
      });

      if (note?.contentMarkdown) {
        this.saveMeetingNoteToWiki(auth, roomId, note.contentMarkdown).catch((err) =>
          this.logger.warn(`Failed to save meeting note to wiki: ${err}`),
        );
      }

      await this.prisma.meetingNote.updateMany({
        where: { roomId, sessionEndAt: null },
        data: { sessionEndAt: new Date(), contentMarkdown: '' },
      });
    }

    const updatedRoom = await this.prisma.officeRoom.findUnique({
      where: { id: roomId },
      include: roomInclude,
    });

    await this.events.publish({
      event: OfficeRealtimeEvent.PARTICIPANT_LEFT,
      orgId: auth.orgId,
      roomId,
      payload: {
        roomId,
        userId: auth.userId,
        room: updatedRoom,
      },
    });

    return { left: true };
  }

  async getMeetingNote(auth: AuthContext, roomId: string) {
    await this.findRoomOrThrow(roomId, auth.orgId);
    const note = await this.prisma.meetingNote.findFirst({
      where: { roomId, sessionEndAt: null },
      orderBy: { sessionStartAt: 'desc' },
    });
    return note;
  }

  async updateMeetingNote(auth: AuthContext, roomId: string, input: UpdateMeetingNoteDto) {
    await this.findRoomOrThrow(roomId, auth.orgId);
    const note = await this.prisma.meetingNote.findFirst({
      where: { roomId, sessionEndAt: null },
      orderBy: { sessionStartAt: 'desc' },
    });
    if (!note) {
      throw new NotFoundException('No active meeting note for this room');
    }
    const updated = await this.prisma.meetingNote.update({
      where: { id: note.id },
      data: { contentMarkdown: input.contentMarkdown },
    });
    await this.events.publish({
      event: OfficeRealtimeEvent.NOTE_UPDATED,
      orgId: auth.orgId,
      roomId,
      payload: updated,
    });
    return updated;
  }

  async summarizeMeetingNote(auth: AuthContext, roomId: string, input: SummarizeMeetingNoteDto) {
    await this.findRoomOrThrow(roomId, auth.orgId);
    const note = await this.prisma.meetingNote.findFirst({
      where: { roomId, sessionEndAt: null },
      orderBy: { sessionStartAt: 'desc' },
    });
    if (!note) {
      throw new NotFoundException('No active meeting note for this room');
    }

    const aiNotes = await this.callMeetingNotesAi(auth, roomId, {
      transcriptMarkdown: input.transcriptMarkdown,
      existingNotesMarkdown: note.contentMarkdown,
    });

    const aiBlock = `${AI_NOTES_BLOCK_START}\n${aiNotes.markdown.trim()}\n${AI_NOTES_BLOCK_END}`;
    const contentMarkdown = this.mergeAiNotesBlock(note.contentMarkdown, aiBlock);
    const updated = await this.prisma.meetingNote.update({
      where: { id: note.id },
      data: { contentMarkdown },
    });

    await this.events.publish({
      event: OfficeRealtimeEvent.NOTE_UPDATED,
      orgId: auth.orgId,
      roomId,
      payload: updated,
    });

    return {
      note: updated,
      summary: aiNotes.summary,
    };
  }

  async transcribeMeetingRecording(
    auth: AuthContext,
    roomId: string,
    input: TranscribeMeetingRecordingDto,
  ) {
    await this.findRoomOrThrow(roomId, auth.orgId);
    const note = await this.prisma.meetingNote.findFirst({
      where: { roomId, sessionEndAt: null },
      orderBy: { sessionStartAt: 'desc' },
    });
    if (!note) {
      throw new NotFoundException('No active meeting note for this room');
    }

    const transcription = await this.callMeetingTranscriptionAi(auth, roomId, input);
    const transcriptBlock = [
      FINAL_TRANSCRIPT_BLOCK_START,
      '## Final transcript',
      transcription.transcriptMarkdown.trim(),
      FINAL_TRANSCRIPT_BLOCK_END,
    ].join('\n');
    const withTranscript = this.mergeManagedBlock(
      note.contentMarkdown,
      transcriptBlock,
      FINAL_TRANSCRIPT_BLOCK_START,
      FINAL_TRANSCRIPT_BLOCK_END,
    );

    const aiNotes = await this.callMeetingNotesAi(auth, roomId, {
      transcriptMarkdown: transcription.transcriptMarkdown,
      existingNotesMarkdown: withTranscript,
    });
    const aiBlock = `${AI_NOTES_BLOCK_START}\n${aiNotes.markdown.trim()}\n${AI_NOTES_BLOCK_END}`;
    const contentMarkdown = this.mergeAiNotesBlock(withTranscript, aiBlock);

    const updated = await this.prisma.meetingNote.update({
      where: { id: note.id },
      data: { contentMarkdown },
    });

    await this.events.publish({
      event: OfficeRealtimeEvent.NOTE_UPDATED,
      orgId: auth.orgId,
      roomId,
      payload: updated,
    });

    return {
      note: updated,
      text: transcription.text,
      transcriptMarkdown: transcription.transcriptMarkdown,
      segments: transcription.segments,
      model: transcription.model,
      summary: aiNotes.summary,
    };
  }

  async generateLiveKitToken(auth: AuthContext, roomId: string) {
    await this.findRoomOrThrow(roomId, auth.orgId);
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_WS_URL ?? 'ws://localhost:7880';

    if (!apiKey || !apiSecret) {
      throw new ServiceUnavailableException('LiveKit credentials not configured');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      select: { displayName: true },
    });

    const lkRoomName = this.liveKitRoomName(auth.orgId, roomId);
    const at = new AccessToken(apiKey, apiSecret, {
      identity: auth.userId,
      name: user?.displayName ?? auth.userId,
    });
    at.addGrant({
      roomJoin: true,
      room: lkRoomName,
      canPublish: true,
      canSubscribe: true,
    });

    return {
      token: await at.toJwt(),
      wsUrl,
    };
  }

  async startLiveTranscription(
    auth: AuthContext,
    roomId: string,
    input: StartLiveTranscriptionDto,
  ) {
    await this.findRoomOrThrow(roomId, auth.orgId);
    await this.ensureActiveMeetingNote(roomId, auth.orgId);

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_WS_URL ?? 'ws://localhost:7880';

    if (!apiKey || !apiSecret) {
      throw new ServiceUnavailableException('LiveKit credentials not configured');
    }

    const lkRoomName = this.liveKitRoomName(auth.orgId, roomId);
    const identity = `serenity-transcriber-${roomId}`;
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: 'Serenity Transcriber',
    });
    at.addGrant({
      roomJoin: true,
      room: lkRoomName,
      canPublish: false,
      canSubscribe: true,
    });

    return this.callLiveTranscriptionAi('start', {
      orgId: auth.orgId,
      roomId,
      roomName: lkRoomName,
      livekitWsUrl: wsUrl,
      livekitToken: await at.toJwt(),
      model: input.model,
    });
  }

  async stopLiveTranscription(auth: AuthContext, roomId: string) {
    await this.findRoomOrThrow(roomId, auth.orgId);
    return this.callLiveTranscriptionAi('stop', { roomId });
  }

  async appendLiveTranscriptSegment(roomId: string, input: LiveTranscriptSegmentDto) {
    if (input.roomId !== roomId) {
      throw new NotFoundException('Room id mismatch');
    }
    await this.findRoomOrThrow(roomId, input.orgId);

    const note = await this.ensureActiveMeetingNote(roomId, input.orgId);
    const line = this.formatLiveTranscriptLine(input);
    const contentWithTranscript = this.appendLiveTranscriptLine(note.contentMarkdown, line);

    const shouldSummarize = this.shouldSummarizeLiveTranscript(roomId);
    let contentMarkdown = contentWithTranscript;
    let aiNotes: AiMeetingNotesResponse | null = null;

    if (shouldSummarize) {
      try {
        aiNotes = await this.callMeetingNotesAi(
          { orgId: input.orgId, userId: 'serenity-transcriber', role: WorkspaceRole.MEMBER },
          roomId,
          {
            transcriptMarkdown: this.extractManagedBlock(
              contentWithTranscript,
              LIVE_TRANSCRIPT_BLOCK_START,
              LIVE_TRANSCRIPT_BLOCK_END,
            ),
            existingNotesMarkdown: contentWithTranscript,
          },
        );
        const aiBlock = [
          AI_NOTES_BLOCK_START,
          aiNotes.markdown.trim(),
          AI_NOTES_BLOCK_END,
        ].join('\n');
        contentMarkdown = this.mergeAiNotesBlock(contentWithTranscript, aiBlock);
      } catch (error) {
        this.logger.warn(`Live meeting note summary skipped: ${error}`);
      }
    }

    const updated = await this.prisma.meetingNote.update({
      where: { id: note.id },
      data: { contentMarkdown },
    });

    await this.events.publish({
      event: OfficeRealtimeEvent.NOTE_UPDATED,
      orgId: input.orgId,
      roomId,
      payload: updated,
    });

    return {
      note: updated,
      segment: input,
      summarized: aiNotes !== null,
    };
  }

  private async callMeetingNotesAi(
    auth: AuthContext,
    roomId: string,
    input: { transcriptMarkdown: string; existingNotesMarkdown: string },
  ): Promise<AiMeetingNotesResponse> {
    const aiBaseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8001/api/internal/v1';
    const internalToken = this.internalApiToken();

    try {
      const res = await fetch(`${aiBaseUrl}/ai/meetings/notes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-api-token': internalToken,
        },
        body: JSON.stringify({
          authContext: {
            orgId: auth.orgId,
            userId: auth.userId,
            role: auth.role,
          },
          roomId,
          transcriptMarkdown: input.transcriptMarkdown,
          existingNotesMarkdown: input.existingNotesMarkdown,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`AI meeting notes error ${res.status}: ${body}`);
        throw new BadGatewayException('AI meeting notes service failed');
      }

      return await res.json() as AiMeetingNotesResponse;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      this.logger.error(`Failed to call AI meeting notes service: ${error}`);
      throw new ServiceUnavailableException('AI meeting notes service unavailable');
    }
  }

  private async callMeetingTranscriptionAi(
    auth: AuthContext,
    roomId: string,
    input: TranscribeMeetingRecordingDto,
  ): Promise<AiMeetingTranscriptionResponse> {
    const aiBaseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8001/api/internal/v1';
    const internalToken = this.internalApiToken();

    try {
      const res = await fetch(`${aiBaseUrl}/ai/meetings/transcribe`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-api-token': internalToken,
        },
        body: JSON.stringify({
          authContext: {
            orgId: auth.orgId,
            userId: auth.userId,
            role: auth.role,
          },
          roomId,
          audioUrl: input.audioUrl,
          model: input.model,
          language: input.language,
          prompt: input.prompt,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`AI meeting transcription error ${res.status}: ${body}`);
        throw new BadGatewayException('AI meeting transcription service failed');
      }

      return await res.json() as AiMeetingTranscriptionResponse;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      this.logger.error(`Failed to call AI meeting transcription service: ${error}`);
      throw new ServiceUnavailableException('AI meeting transcription service unavailable');
    }
  }

  private async callLiveTranscriptionAi(action: 'start' | 'stop', body: Record<string, unknown>) {
    const aiBaseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8001/api/internal/v1';
    const internalToken = this.internalApiToken();

    try {
      const res = await fetch(`${aiBaseUrl}/ai/meetings/live/${action}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-api-token': internalToken,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const responseBody = await res.text();
        this.logger.error(`AI live transcription ${action} error ${res.status}: ${responseBody}`);
        throw new BadGatewayException('AI live transcription service failed');
      }

      return await res.json() as { roomId: string; status: string; model?: string };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      this.logger.error(`Failed to call AI live transcription service: ${error}`);
      throw new ServiceUnavailableException('AI live transcription service unavailable');
    }
  }

  private mergeAiNotesBlock(content: string, aiBlock: string) {
    return this.mergeManagedBlock(content, aiBlock, AI_NOTES_BLOCK_START, AI_NOTES_BLOCK_END);
  }

  private mergeManagedBlock(
    content: string,
    block: string,
    startMarker: string,
    endMarker: string,
  ) {
    const start = content.indexOf(startMarker);
    const end = content.indexOf(endMarker);

    if (start >= 0 && end >= start) {
      return `${content.slice(0, start).trimEnd()}\n\n${block}\n${content
        .slice(end + endMarker.length)
        .trimStart()}`.trim();
    }

    return `${content.trimEnd()}\n\n${block}`.trim();
  }

  private appendLiveTranscriptLine(content: string, line: string) {
    const existingBlock = this.extractManagedBlock(
      content,
      LIVE_TRANSCRIPT_BLOCK_START,
      LIVE_TRANSCRIPT_BLOCK_END,
    );
    const currentLines = existingBlock
      .split('\n')
      .filter((blockLine) => blockLine.trim() && blockLine.trim() !== '## Live transcript');
    const transcriptLines = [...currentLines, line].slice(-500);
    const liveBlock = [
      LIVE_TRANSCRIPT_BLOCK_START,
      '## Live transcript',
      ...transcriptLines,
      LIVE_TRANSCRIPT_BLOCK_END,
    ].join('\n');

    return this.mergeManagedBlock(
      content,
      liveBlock,
      LIVE_TRANSCRIPT_BLOCK_START,
      LIVE_TRANSCRIPT_BLOCK_END,
    );
  }

  private extractManagedBlock(content: string, startMarker: string, endMarker: string) {
    const start = content.indexOf(startMarker);
    const end = content.indexOf(endMarker);
    if (start < 0 || end < start) {
      return '';
    }
    return content.slice(start + startMarker.length, end).trim();
  }

  private formatLiveTranscriptLine(input: LiveTranscriptSegmentDto) {
    const speaker = input.speaker.trim() || 'Speaker';
    const timestamp = this.formatTranscriptTimestamp(input.endedAtMs ?? input.startedAtMs);
    return `- ${timestamp} ${speaker}: ${input.text.trim()}`;
  }

  private formatTranscriptTimestamp(timeMs?: number) {
    if (timeMs === undefined) {
      return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(),
      );
    }
    const seconds = Math.max(0, Math.floor(timeMs / 1000));
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
  }

  private shouldSummarizeLiveTranscript(roomId: string) {
    const now = Date.now();
    const previous = this.liveSummaryAtByRoom.get(roomId) ?? 0;
    if (now - previous < LIVE_SUMMARY_INTERVAL_MS) {
      return false;
    }
    this.liveSummaryAtByRoom.set(roomId, now);
    return true;
  }

  private async ensureActiveMeetingNote(roomId: string, orgId: string) {
    const note = await this.prisma.meetingNote.findFirst({
      where: { roomId, sessionEndAt: null },
      orderBy: { sessionStartAt: 'desc' },
    });
    if (note) {
      return note;
    }
    return this.prisma.meetingNote.create({
      data: { roomId, orgId },
    });
  }

  private async saveMeetingNoteToWiki(
    auth: AuthContext,
    roomId: string,
    contentMarkdown: string,
  ): Promise<void> {
    const hasContent = contentMarkdown.replace(/<!--[\s\S]*?-->/g, '').trim().length > 0;
    if (!hasContent) return;

    let summaryMarkdown = contentMarkdown;
    const aiBlock = this.extractManagedBlock(
      contentMarkdown,
      AI_NOTES_BLOCK_START,
      AI_NOTES_BLOCK_END,
    );

    if (!aiBlock) {
      try {
        const aiNotes = await this.callMeetingNotesAi(auth, roomId, {
          transcriptMarkdown: contentMarkdown,
          existingNotesMarkdown: contentMarkdown,
        });
        const block = `${AI_NOTES_BLOCK_START}\n${aiNotes.markdown.trim()}\n${AI_NOTES_BLOCK_END}`;
        summaryMarkdown = this.mergeAiNotesBlock(contentMarkdown, block);
      } catch (err) {
        this.logger.warn(`saveMeetingNoteToWiki: summary generation failed: ${err}`);
      }
    }

    const room = await this.prisma.officeRoom.findUnique({ where: { id: roomId } });
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const title = `Meeting: ${room?.name ?? 'Room'} — ${date}`;

    const summary = this.extractManagedBlock(summaryMarkdown, AI_NOTES_BLOCK_START, AI_NOTES_BLOCK_END);

    await this.wiki.createPage(auth.orgId, auth.userId, {
      title,
      contentMarkdown: summary || summaryMarkdown,
      visibility: WikiPageVisibility.ORG,
      icon: '📝',
    });
  }

  private liveKitRoomName(orgId: string, roomId: string) {
    return `lk-${orgId}-${roomId}`;
  }

  private internalApiToken() {
    return process.env.INTERNAL_API_TOKEN ?? process.env.AI_INTERNAL_API_TOKEN ?? '';
  }

  private async findRoomOrThrow(roomId: string, orgId: string) {
    const room = await this.prisma.officeRoom.findFirst({
      where: { id: roomId, orgId, deletedAt: null },
    });
    if (!room) {
      throw new NotFoundException('Office room not found');
    }
    return room;
  }

  private assertAdminOrOwner(role: WorkspaceRole) {
    if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage office rooms');
    }
  }
}
