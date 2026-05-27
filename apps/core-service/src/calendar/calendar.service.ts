import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CalendarItemType,
  CalendarTaskStatus,
  CalendarVisibility,
  Prisma,
  WorkspaceRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreateCalendarItemDto,
  ListCalendarItemsQueryDto,
  UpdateCalendarItemDto,
} from './dto/calendar.dto';

type CalendarItemWithAttendees = Prisma.CalendarItemGetPayload<{
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
  };
}>;

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async listItems(orgId: string, userId: string, query: ListCalendarItemsQueryDto) {
    await this.ensureOrgAccess(orgId, userId);

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
      include: this.includeAttendees(),
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
      include: this.includeAttendees(),
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
        include: this.includeAttendees(),
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

  private includeAttendees() {
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
      include: this.includeAttendees(),
    });

    if (!item) {
      throw new NotFoundException('Calendar item not found');
    }

    return item;
  }

  private assertCanEdit(item: CalendarItemWithAttendees, userId: string, role: WorkspaceRole) {
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

  private toDto(item: CalendarItemWithAttendees) {
    return {
      id: item.id,
      type: item.type,
      visibility: item.visibility,
      title: item.title,
      descriptionMarkdown: item.descriptionMarkdown,
      location: item.location,
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
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
