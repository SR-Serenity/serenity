import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { AccessToken } from 'livekit-server-sdk';
import { PrismaService } from '../database/prisma.service';
import { OfficeRealtimeEvent } from '../realtime/config/enums/office-realtime-event.enum';
import { OfficeEventsService } from './office-events.service';
import type { CreateRoomDto, UpdateMeetingNoteDto, UpdateRoomDto } from './dto/office.dto';

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

@Injectable()
export class OfficeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OfficeEventsService,
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
      await this.prisma.meetingNote.updateMany({
        where: { roomId, sessionEndAt: null },
        data: { sessionEndAt: new Date() },
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

    const lkRoomName = `lk-${auth.orgId}-${roomId}`;
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
