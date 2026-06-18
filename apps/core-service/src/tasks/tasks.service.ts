import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AutomationTriggerType,
  Prisma,
  TaskPriority,
  TaskSourceType,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AutomationEngineService } from '../automation/automation-engine.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

export type ListTasksFilters = {
  status?: TaskStatus;
  assigneeId?: string;
  priority?: TaskPriority;
  sourceType?: TaskSourceType;
  createdByAi?: boolean;
  dueBefore?: string;
  search?: string;
  mine?: boolean;
};

type TaskWithRelations = Prisma.TaskGetPayload<{
  include: {
    assignee: { select: { displayName: true } };
    creator: { select: { displayName: true } };
  };
}>;

const TASK_INCLUDE = {
  assignee: { select: { displayName: true } },
  creator: { select: { displayName: true } },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly automationEngine: AutomationEngineService,
  ) {}

  async listTasks(orgId: string, userId: string, filters: ListTasksFilters = {}) {
    await this.ensureOrgAccess(orgId, userId);

    const where: Prisma.TaskWhereInput = { orgId };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.sourceType) {
      where.sourceType = filters.sourceType;
    }
    if (filters.createdByAi !== undefined) {
      where.createdByAi = filters.createdByAi;
    }
    if (filters.mine) {
      where.assigneeId = userId;
    } else if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }
    if (filters.dueBefore) {
      where.dueDate = { lte: new Date(filters.dueBefore) };
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [{ createdAt: 'desc' }],
    });

    return { tasks: tasks.map((task) => this.toExternalTask(task)) };
  }

  async getTask(orgId: string, taskId: string, userId: string) {
    await this.ensureOrgAccess(orgId, userId);

    const task = await this.prisma.task.findFirst({
      where: { id: taskId, orgId },
      include: TASK_INCLUDE,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.toExternalTask(task);
  }

  async createTask(orgId: string, userId: string, input: CreateTaskDto) {
    await this.ensureOrgAccess(orgId, userId);
    await this.ensureAssignee(orgId, input.assigneeId);

    const task = await this.prisma.task.create({
      data: {
        orgId,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? TaskStatus.TODO,
        priority: input.priority ?? TaskPriority.MEDIUM,
        assigneeId: input.assigneeId || null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        sourceType: input.sourceType ?? TaskSourceType.MANUAL,
        sourceId: input.sourceId ?? null,
        sourceTitle: input.sourceTitle ?? null,
        createdBy: userId,
        createdByAi: input.createdByAi ?? false,
        aiReason: input.aiReason ?? null,
      },
      include: TASK_INCLUDE,
    });

    this.automationEngine.runTaskTrigger({
      taskId: task.id,
      orgId,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      triggerType: AutomationTriggerType.TASK_CREATED,
    }).catch(() => undefined);

    if (task.assigneeId) {
      this.automationEngine.runTaskTrigger({
        taskId: task.id,
        orgId,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        previousAssigneeId: null,
        triggerType: AutomationTriggerType.TASK_ASSIGNED,
      }).catch(() => undefined);
    }

    return this.toExternalTask(task);
  }

  async updateTask(
    orgId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskDto,
  ) {
    await this.ensureOrgAccess(orgId, userId);

    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, orgId },
    });

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    if (input.assigneeId) {
      await this.ensureAssignee(orgId, input.assigneeId);
    }

    const data: Prisma.TaskUpdateInput = {};
    if (input.title !== undefined) {
      data.title = input.title;
    }
    if (input.description !== undefined) {
      data.description = input.description;
    }
    if (input.status !== undefined) {
      data.status = input.status;
    }
    if (input.priority !== undefined) {
      data.priority = input.priority;
    }
    if (input.assigneeId !== undefined) {
      data.assignee = input.assigneeId
        ? { connect: { id: input.assigneeId } }
        : { disconnect: true };
    }
    if (input.dueDate !== undefined) {
      data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }

    const task = await this.prisma.task.update({
      where: { id: existing.id },
      data,
      include: TASK_INCLUDE,
    });

    if (input.status !== undefined && input.status !== existing.status) {
      this.automationEngine.runTaskTrigger({
        taskId: task.id,
        orgId,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        previousStatus: existing.status,
        triggerType: AutomationTriggerType.TASK_STATUS_CHANGED,
      }).catch(() => undefined);
    }

    if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
      this.automationEngine.runTaskTrigger({
        taskId: task.id,
        orgId,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        previousAssigneeId: existing.assigneeId,
        triggerType: AutomationTriggerType.TASK_ASSIGNED,
      }).catch(() => undefined);
    }

    return this.toExternalTask(task);
  }

  async deleteTask(orgId: string, taskId: string, userId: string) {
    await this.ensureOrgAccess(orgId, userId);

    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, orgId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.task.delete({ where: { id: existing.id } });

    return { success: true };
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

  private async ensureAssignee(orgId: string, assigneeId?: string | null) {
    if (!assigneeId) {
      return;
    }

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { orgId, userId: assigneeId },
      select: { id: true },
    });

    if (!membership) {
      throw new NotFoundException('Assignee is not a member of this workspace');
    }
  }

  private toExternalTask(task: TaskWithRelations) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      assigneeName: task.assignee?.displayName ?? null,
      dueDate: task.dueDate,
      sourceType: task.sourceType,
      sourceId: task.sourceId,
      sourceTitle: task.sourceTitle,
      createdBy: task.createdBy,
      createdByName: task.creator?.displayName ?? null,
      createdByAi: task.createdByAi,
      aiReason: task.aiReason,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
