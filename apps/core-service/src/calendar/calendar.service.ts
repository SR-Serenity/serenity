import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CalendarItemType,
  CalendarTaskStatus,
  CalendarVisibility,
  MailAccountStatus,
  Prisma,
  WorkspaceRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MailTokenService } from '../mail/mail-token.service';
import {
  CreateCalendarItemDto,
  ListCalendarItemsQueryDto,
  UpdateCalendarItemDto,
} from './dto/calendar.dto';
import { GoogleCalendarClient } from './google-calendar.client';

type CalendarItemWithRelations = Prisma.CalendarItemGetPayload<{
  include: {
    attendees: {
      include: {
        user: {
          select: {
            id: true;
            displayName: true;
            email: true;
          };
        };
      };
    };
    room: {
      select: {
        id: true;
        name: true;
        type: true;
        maxCapacity: true;
      };
    };
    wikiPage: {
      select: {
        id: true;
        title: true;
      };
    };
  };
}>;

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gcal: GoogleCalendarClient,
    private readonly tokenService: MailTokenService,
  ) {}

  async listItems(orgId: string, userId: string, query: ListCalendarItemsQueryDto) {
    await this.ensureOrgAccess(orgId, userId);

    if (query.from && query.to) {
      await this.syncGoogleEvents(orgId, userId, query.from, query.to).catch((err) =>
        this.logger.warn(`Google Calendar sync skipped: ${err?.message}`),
      );
    }

    const where: Prisma.CalendarItemWhereInput = {
      orgId,
      deletedAt: null,
      AND: [
        {
          OR: [
            { visibility: CalendarVisibility.COMPANY },
            { createdById: userId },
            { attendees: { some: { userId } } },
          ],
        },
      ],
    };

    if (query.visibility) {
      where.visibility = query.visibility;
    }
    if (query.type) {
      where.type = query.type;
    }

    const range = this.buildRangeFilter(query.from, query.to);
    if (range) {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), range];
    }

    const items = await this.prisma.calendarItem.findMany({
      where,
      include: this.includeRelations(),
      orderBy: [{ startAt: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    return { items: items.map((item) => this.toDto(item)) };
  }

  async createItem(orgId: string, userId: string, input: CreateCalendarItemDto) {
    await this.ensureOrgAccess(orgId, userId);
    this.validateItem(input);
    const attendeeIds = await this.validateAttendees(orgId, input.attendeeIds ?? []);

    const item = await this.prisma.calendarItem.create({
      data: {
        orgId,
        createdById: userId,
        type: input.type,
        visibility: input.visibility,
        title: input.title.trim(),
        descriptionMarkdown: this.nullableText(input.descriptionMarkdown),
        location: this.nullableText(input.location),
        roomId: input.roomId ?? null,
        wikiPageId: input.wikiPageId ?? null,
        startAt: this.dateOrNull(input.startAt),
        endAt: this.dateOrNull(input.endAt),
        allDay: input.allDay ?? false,
        taskStatus: input.type === CalendarItemType.TASK
          ? input.taskStatus ?? CalendarTaskStatus.TODO
          : null,
        dueDate: input.type === CalendarItemType.TASK ? this.dateOrNull(input.dueDate) : null,
        attendees: {
          create: attendeeIds.map((attendeeId) => ({ userId: attendeeId })),
        },
      },
      include: this.includeRelations(),
    });

    return this.toDto(item);
  }

  async updateItem(
    orgId: string,
    userId: string,
    role: WorkspaceRole,
    itemId: string,
    input: UpdateCalendarItemDto,
  ) {
    await this.ensureOrgAccess(orgId, userId);
    const existing = await this.findEditableItem(orgId, itemId);
    this.assertCanEdit(existing, userId, role);

    const merged = {
      type: input.type ?? existing.type,
      visibility: input.visibility ?? existing.visibility,
      title: input.title ?? existing.title,
      descriptionMarkdown:
        input.descriptionMarkdown !== undefined
          ? input.descriptionMarkdown
          : existing.descriptionMarkdown,
      location: input.location !== undefined ? input.location : existing.location,
      startAt:
        input.startAt !== undefined
          ? input.startAt
          : existing.startAt?.toISOString() ?? null,
      endAt:
        input.endAt !== undefined
          ? input.endAt
          : existing.endAt?.toISOString() ?? null,
      allDay: input.allDay ?? existing.allDay,
      taskStatus:
        input.taskStatus !== undefined ? input.taskStatus : existing.taskStatus,
      dueDate:
        input.dueDate !== undefined
          ? input.dueDate
          : existing.dueDate?.toISOString() ?? null,
      attendeeIds: input.attendeeIds,
    };
    this.validateItem(merged);

    const data: Prisma.CalendarItemUpdateInput = {};
    if (input.type !== undefined) {
      data.type = input.type;
    }
    if (input.visibility !== undefined) {
      data.visibility = input.visibility;
    }
    if (input.title !== undefined) {
      data.title = input.title.trim();
    }
    if (input.descriptionMarkdown !== undefined) {
      data.descriptionMarkdown = this.nullableText(input.descriptionMarkdown);
    }
    if (input.location !== undefined) {
      data.location = this.nullableText(input.location);
    }
    if (input.roomId !== undefined) {
      data.roomId = input.roomId ?? null;
    }
    if (input.wikiPageId !== undefined) {
      data.wikiPageId = input.wikiPageId ?? null;
    }
    if (input.startAt !== undefined) {
      data.startAt = this.dateOrNull(input.startAt);
    }
    if (input.endAt !== undefined) {
      data.endAt = this.dateOrNull(input.endAt);
    }
    if (input.allDay !== undefined) {
      data.allDay = input.allDay;
    }
    if (input.dueDate !== undefined) {
      data.dueDate =
        merged.type === CalendarItemType.TASK
          ? this.dateOrNull(input.dueDate)
          : null;
    }
    if (input.taskStatus !== undefined || input.type !== undefined) {
      data.taskStatus =
        merged.type === CalendarItemType.TASK
          ? input.taskStatus ?? existing.taskStatus ?? CalendarTaskStatus.TODO
          : null;
    }

    const attendeeIds = input.attendeeIds
      ? await this.validateAttendees(orgId, input.attendeeIds)
      : null;

    const item = await this.prisma.$transaction(async (tx) => {
      if (attendeeIds) {
        await tx.calendarAttendee.deleteMany({ where: { itemId: existing.id } });
      }

      return tx.calendarItem.update({
        where: { id: existing.id },
        data: {
          ...data,
          attendees: attendeeIds
            ? { create: attendeeIds.map((attendeeId) => ({ userId: attendeeId })) }
            : undefined,
        },
        include: this.includeRelations(),
      });
    });

    return this.toDto(item);
  }

  async deleteItem(orgId: string, userId: string, role: WorkspaceRole, itemId: string) {
    await this.ensureOrgAccess(orgId, userId);
    const existing = await this.findEditableItem(orgId, itemId);
    this.assertCanEdit(existing, userId, role);

    await this.prisma.calendarItem.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  private includeRelations() {
    return {
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
      room: {
        select: {
          id: true,
          name: true,
          type: true,
          maxCapacity: true,
        },
      },
      wikiPage: {
        select: {
          id: true,
          title: true,
        },
      },
    };
  }

  private buildRangeFilter(from?: string, to?: string): Prisma.CalendarItemWhereInput | null {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    if (!fromDate && !toDate) {
      return null;
    }

    const lte = toDate ?? undefined;
    const gte = fromDate ?? undefined;

    return {
      OR: [
        { startAt: { gte, lte } },
        { endAt: { gte, lte } },
        { dueDate: { gte, lte } },
        {
          AND: [
            fromDate ? { startAt: { lte: fromDate } } : {},
            toDate ? { endAt: { gte: toDate } } : {},
          ],
        },
      ],
    };
  }

  private validateItem(input: {
    type: CalendarItemType;
    title: string;
    startAt?: string | Date | null;
    endAt?: string | Date | null;
    dueDate?: string | Date | null;
  }) {
    if (!input.title.trim()) {
      throw new BadRequestException('Title is required');
    }

    const startAt = this.dateOrNull(input.startAt);
    const endAt = this.dateOrNull(input.endAt);

    if (input.type !== CalendarItemType.TASK && (!startAt || !endAt)) {
      throw new BadRequestException('Events and meetings require start and end times');
    }

    if (startAt && endAt && endAt <= startAt) {
      throw new BadRequestException('End time must be after start time');
    }
  }

  private async validateAttendees(orgId: string, attendeeIds: string[]) {
    const uniqueIds = Array.from(new Set(attendeeIds.filter(Boolean)));
    if (!uniqueIds.length) {
      return [];
    }

    const members = await this.prisma.workspaceMember.findMany({
      where: { orgId, userId: { in: uniqueIds } },
      select: { userId: true },
    });
    const validIds = new Set(members.map((member) => member.userId));
    const invalidId = uniqueIds.find((id) => !validIds.has(id));
    if (invalidId) {
      throw new BadRequestException(`Attendee is not a member of this workspace: ${invalidId}`);
    }

    return uniqueIds;
  }

  private async findEditableItem(orgId: string, itemId: string) {
    const item = await this.prisma.calendarItem.findFirst({
      where: { id: itemId, orgId, deletedAt: null },
      include: this.includeRelations(),
    });

    if (!item) {
      throw new NotFoundException('Calendar item not found');
    }

    return item;
  }

  private assertCanEdit(item: CalendarItemWithRelations, userId: string, role: WorkspaceRole) {
    if (item.createdById === userId) {
      return;
    }

    if (
      item.visibility === CalendarVisibility.COMPANY &&
      (role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN)
    ) {
      return;
    }

    throw new ForbiddenException('You cannot edit this calendar item');
  }

  private async ensureOrgAccess(orgId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { orgId, userId },
      select: { id: true },
    });

    if (!membership) {
      throw new UnauthorizedException('Organization access denied');
    }
  }

  private dateOrNull(value?: string | Date | null) {
    if (!value) {
      return null;
    }
    return value instanceof Date ? value : new Date(value);
  }

  private nullableText(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private toDto(item: CalendarItemWithRelations) {
    return {
      id: item.id,
      type: item.type,
      visibility: item.visibility,
      title: item.title,
      descriptionMarkdown: item.descriptionMarkdown,
      location: item.location,
      roomId: item.roomId,
      room: item.room ?? null,
      wikiPageId: item.wikiPageId,
      wikiPage: item.wikiPage ?? null,
      startAt: item.startAt,
      endAt: item.endAt,
      allDay: item.allDay,
      taskStatus: item.taskStatus,
      dueDate: item.dueDate,
      createdById: item.createdById,
      attendees: item.attendees.map((attendee) => ({
        userId: attendee.user.id,
        displayName: attendee.user.displayName,
        email: attendee.user.email,
      })),
      googleEventId: item.googleEventId ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private async syncGoogleEvents(orgId: string, userId: string, from: string, to: string) {
    const account = await this.prisma.mailAccount.findFirst({
      where: { orgId, userId, status: MailAccountStatus.CONNECTED },
      select: { id: true, encryptedRefreshToken: true },
    });
    if (!account?.encryptedRefreshToken) return;

    const refreshToken = this.tokenService.decrypt(account.encryptedRefreshToken);
    const googleEvents = await this.gcal.listEvents(refreshToken, from, to);
    const fetchedIds = new Set(googleEvents.map((e) => e.id).filter(Boolean) as string[]);

    // Remove local records for Google events that no longer exist in this range
    await this.prisma.calendarItem.deleteMany({
      where: {
        createdById: userId,
        orgId,
        deletedAt: null,
        googleEventId: { not: null, notIn: [...fetchedIds] },
        startAt: { gte: new Date(from), lte: new Date(to) },
      },
    });

    for (const event of googleEvents) {
      if (!event.id || !event.summary) continue;

      const allDay = !event.start?.dateTime;
      const startAt = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : event.start?.date
          ? new Date(event.start.date)
          : null;
      const endAt = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : event.end?.date
          ? new Date(event.end.date)
          : null;

      const payload = {
        title: event.summary,
        descriptionMarkdown: event.description ?? null,
        location: event.location ?? null,
        startAt,
        endAt,
        allDay,
        updatedAt: new Date(),
      };

      const existing = await this.prisma.calendarItem.findFirst({
        where: { createdById: userId, googleEventId: event.id, deletedAt: null },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.calendarItem.update({ where: { id: existing.id }, data: payload });
      } else {
        await this.prisma.calendarItem.create({
          data: {
            orgId,
            createdById: userId,
            type: CalendarItemType.EVENT,
            visibility: CalendarVisibility.PERSONAL,
            googleEventId: event.id,
            googleAccountId: account.id,
            ...payload,
          },
        });
      }
    }
  }
}
