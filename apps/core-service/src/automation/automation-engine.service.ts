import { Injectable, Logger } from '@nestjs/common';
import { AutomationActionType, AutomationTriggerType, TaskPriority, TaskSourceType, TaskStatus } from '@prisma/client';
import type { AutomationRule } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { RealtimeDomain } from '../realtime/config/enums/realtime-domain.enum';
import { ChatRealtimeEvent } from '../realtime/config/enums/chat-realtime-event.enum';
import { AutomationAgentService } from './automation-agent.service';
import type { AgentContext } from './automation-agent.service';
import { AutomationConditionType } from './dto/automation.dto';
import type { StepNode, StepsGraph } from './dto/automation.dto';

const aiMessageInclude = {
  author: { select: { id: true, email: true, displayName: true } },
  replyTo: {
    select: {
      id: true, authorId: true, content: true, unsentAt: true,
      author: { select: { id: true, email: true, displayName: true } },
    },
  },
  attachments: true,
  reactions: { include: { user: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'asc' as const } },
  replies: { select: { id: true } },
} as const;

type ChatMessageContext = {
  conversationId: string;
  content: string;
  authorId: string;
};

type ScheduleConfig = { timeZone?: string; timezone?: string; tz?: string };

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export type TaskTriggerEvent = {
  taskId: string;
  orgId: string;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  assigneeId: string | null;
  previousStatus?: TaskStatus;
  previousAssigneeId?: string | null;
  triggerType: Extract<
    AutomationTriggerType,
    'TASK_CREATED' | 'TASK_STATUS_CHANGED' | 'TASK_ASSIGNED'
  >;
};

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agent: AutomationAgentService,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  async runScheduled(ruleId: string): Promise<void> {
    const rule = await this.prisma.automationRule.findUnique({ where: { id: ruleId } });
    if (!rule || !rule.enabled) {
      return;
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: rule.orgId },
      select: { name: true },
    });

    const context: AgentContext = {
      orgId: rule.orgId,
      orgName: org?.name,
      triggerType: AutomationTriggerType.SCHEDULE,
      timeZone: this.timeZoneFromConfig(rule.triggerConfig as ScheduleConfig),
    };

    if (rule.stepsGraph) {
      await this.walkGraph(rule, rule.stepsGraph as unknown as StepsGraph, context);
    } else {
      await this.agent.execute(rule, context);
    }
  }

  async runMemberJoined(orgId: string, userId: string): Promise<void> {
    const rules = await this.prisma.automationRule.findMany({
      where: { orgId, triggerType: AutomationTriggerType.MEMBER_JOINED, enabled: true },
    });
    if (!rules.length) {
      return;
    }

    const [user, org] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
      this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    ]);

    for (const rule of rules) {
      try {
        const context: AgentContext = {
          orgId, userId, displayName: user?.displayName, orgName: org?.name,
          triggerType: AutomationTriggerType.MEMBER_JOINED,
        };
        if (rule.stepsGraph) {
          await this.walkGraph(rule, rule.stepsGraph as unknown as StepsGraph, context);
        } else {
          await this.agent.execute(rule, context);
        }
      } catch (err) {
        this.logger.error(`Failed executing rule ${rule.id} on member_joined: ${err}`);
      }
    }
  }

  async runMessageKeyword(orgId: string, message: ChatMessageContext): Promise<void> {
    const rules = await this.prisma.automationRule.findMany({
      where: { orgId, triggerType: AutomationTriggerType.MESSAGE_KEYWORD, enabled: true },
    });
    if (!rules.length) {
      return;
    }

    const lowerContent = message.content.toLowerCase();

    for (const rule of rules) {
      try {
        const triggerConfig = (rule.stepsGraph
          ? (rule.stepsGraph as unknown as StepsGraph).nodes.find(n => n.type === 'trigger')?.config
          : rule.triggerConfig) as { keywords?: string[]; channelIds?: string[] } | undefined;
        const keywords: string[] = triggerConfig?.keywords ?? [];
        if (!keywords.some(kw => lowerContent.includes(kw.toLowerCase()))) {
          continue;
        }
        const channelIds: string[] = triggerConfig?.channelIds ?? [];
        if (channelIds.length > 0 && !channelIds.includes(message.conversationId)) {
          continue;
        }

        const context: AgentContext = {
          orgId, conversationId: message.conversationId,
          messageContent: message.content, userId: message.authorId,
          triggerType: AutomationTriggerType.MESSAGE_KEYWORD,
        };
        if (rule.stepsGraph) {
          await this.walkGraph(rule, rule.stepsGraph as unknown as StepsGraph, context);
        } else {
          await this.agent.execute(rule, context);
        }
      } catch (err) {
        this.logger.error(`Failed executing rule ${rule.id} on message_keyword: ${err}`);
      }
    }
  }

  async runTaskTrigger(event: TaskTriggerEvent): Promise<void> {
    const rules = await this.prisma.automationRule.findMany({
      where: { orgId: event.orgId, triggerType: event.triggerType, enabled: true },
    });
    if (!rules.length) {
      return;
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: event.orgId },
      select: { name: true },
    });

    for (const rule of rules) {
      try {
        const triggerConfig = (rule.stepsGraph
          ? (rule.stepsGraph as unknown as StepsGraph).nodes.find(n => n.type === 'trigger')?.config
          : rule.triggerConfig) as Record<string, unknown> | undefined;

        if (!this.matchesTaskTrigger(event, triggerConfig ?? {})) {
          continue;
        }

        const context: AgentContext = {
          orgId: event.orgId,
          orgName: org?.name,
          userId: event.assigneeId ?? undefined,
          triggerType: event.triggerType,
          taskId: event.taskId,
          taskTitle: event.title,
          taskStatus: event.status,
          taskPriority: event.priority,
        };

        if (rule.stepsGraph) {
          await this.walkGraph(rule, rule.stepsGraph as unknown as StepsGraph, context);
        } else {
          await this.agent.execute(rule, context);
        }
      } catch (err) {
        this.logger.error(`Failed executing rule ${rule.id} on task trigger: ${err}`);
      }
    }
  }

  private matchesTaskTrigger(event: TaskTriggerEvent, config: Record<string, unknown>): boolean {
    if (event.triggerType === AutomationTriggerType.TASK_STATUS_CHANGED) {
      const requiredStatus = config.status as string | undefined;
      if (requiredStatus && event.status !== requiredStatus) {
        return false;
      }
    }
    if (event.triggerType === AutomationTriggerType.TASK_ASSIGNED) {
      const requiredAssignee = config.assigneeId as string | undefined;
      if (requiredAssignee && event.assigneeId !== requiredAssignee) {
        return false;
      }
      if (event.assigneeId === event.previousAssigneeId) {
        return false;
      }
    }
    return true;
  }

  private async walkGraph(
    rule: AutomationRule,
    graph: StepsGraph,
    context: AgentContext,
  ): Promise<void> {
    const triggerNode = graph.nodes.find(n => n.type === 'trigger');
    if (!triggerNode) {
      return;
    }

    const startIds = graph.edges.filter(e => e.source === triggerNode.id).map(e => e.target);
    const visited = new Set<string>();
    const queue = [...startIds];

    while (queue.length) {
      const nodeId = queue.shift();
      if (!nodeId) {
        break;
      }
      if (visited.has(nodeId)) {
        continue;
      }
      visited.add(nodeId);

      const node = graph.nodes.find(n => n.id === nodeId);
      if (!node) {
        continue;
      }

      if (node.type === 'condition') {
        const passed = await this.evaluateCondition(node, context);
        const branch = passed ? 'true' : 'false';
        const nextIds = graph.edges
          .filter(e => e.source === nodeId && e.sourceHandle === branch)
          .map(e => e.target);
        queue.push(...nextIds);
      } else if (node.type === 'action') {
        await this.executeActionNode(rule, node, context);
        const nextIds = graph.edges.filter(e => e.source === nodeId).map(e => e.target);
        queue.push(...nextIds);
      }
    }
  }

  private async evaluateCondition(node: StepNode, context: AgentContext): Promise<boolean> {
    const config = node.config;

    switch (node.nodeType as AutomationConditionType) {
      case AutomationConditionType.TIME_WINDOW: {
        const { hour, day } = this.currentTimeParts(
          this.timeZoneFromConfig(config as ScheduleConfig) ?? context.timeZone,
        );
        const startHour = this.numberFromConfig(config.startHour, 0);
        const endHour = this.numberFromConfig(config.endHour, 24);
        const days = (config.days as string[]) ?? DAY_NAMES;
        const inWindow = startHour <= endHour
          ? hour >= startHour && hour < endHour
          : hour >= startHour || hour < endHour;
        return inWindow && days.includes(day);
      }

      case AutomationConditionType.CHANNEL_IS: {
        const channelIds = (config.channelIds as string[]) ?? [];
        if (channelIds.length === 0) {
          return true;
        }
        return !!context.conversationId && channelIds.includes(context.conversationId);
      }

      case AutomationConditionType.TASK_PRIORITY_IS: {
        const required = config.priority as string | undefined;
        if (!required) {
          return true;
        }
        return context.taskPriority === required;
      }

      case AutomationConditionType.USER_IN_DEPARTMENT: {
        const departmentId = config.departmentId as string | undefined;
        if (!departmentId || !context.userId) {
          return false;
        }
        const member = await this.prisma.workspaceMember.findFirst({
          where: { userId: context.userId, orgId: context.orgId, departmentId },
          select: { userId: true },
        });
        return !!member;
      }

      default:
        this.logger.warn(`Unknown condition type ${node.nodeType}`);
        return false;
    }
  }

  private currentTimeParts(timeZone?: string): { hour: number; day: string } {
    const now = new Date();
    if (!timeZone) {
      return { hour: now.getHours(), day: DAY_NAMES[now.getDay()] };
    }

    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        hour: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(now);
      const hour = Number(parts.find(part => part.type === 'hour')?.value ?? '0');
      const weekday = parts.find(part => part.type === 'weekday')?.value ?? '';
      return { hour, day: weekday.slice(0, 3).toUpperCase() };
    } catch {
      this.logger.warn(`Invalid automation timezone "${timeZone}"; falling back to server timezone`);
      return { hour: now.getHours(), day: DAY_NAMES[now.getDay()] };
    }
  }

  private numberFromConfig(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private timeZoneFromConfig(config: ScheduleConfig): string | undefined {
    return config.timeZone ?? config.timezone ?? config.tz;
  }

  private async executeActionNode(
    rule: AutomationRule,
    node: StepNode,
    context: AgentContext,
  ): Promise<void> {
    const actionType = node.nodeType as AutomationActionType;

    switch (actionType) {
      case AutomationActionType.AI_AGENT:
        await this.agent.execute(rule, context, node.config as {
          instruction: string;
          targetType: 'CHANNEL' | 'DM_TRIGGER_USER';
          targetId?: string;
        });
        break;

      case AutomationActionType.NOTIFY:
        await this.executeNotify(
          rule.orgId,
          node.config as { userId?: string; message: string },
          context,
        );
        break;

      case AutomationActionType.CREATE_TASK:
        await this.executeCreateTask(rule.orgId, node.config as {
          title: string; status?: TaskStatus; priority?: TaskPriority; assigneeId?: string;
        }, context);
        break;

      case AutomationActionType.POST_CHANNEL:
        await this.executePostChannel(
          rule.orgId,
          node.config as { channelId: string; message: string },
          context,
        );
        break;

      default:
        this.logger.warn(`Unknown action type ${actionType} in rule ${rule.id}`);
    }
  }

  private async executeNotify(
    orgId: string,
    config: { userId?: string; message: string },
    context: AgentContext,
  ): Promise<void> {
    const targetUserId = config.userId ?? context.userId;
    if (!targetUserId || !config.message) {
      return;
    }

    const botUser = await this.prisma.workspaceMember.findFirst({
      where: { orgId, role: 'OWNER' },
      select: { userId: true },
    });
    if (!botUser) {
      return;
    }

    const content = config.message
      .replace('{task.title}', context.taskTitle ?? '')
      .replace('{user.name}', context.displayName ?? '')
      .replace('{date}', new Date().toLocaleDateString());

    const ids = [botUser.userId, targetUserId].sort();
    const dmKey = ids.join(':');
    let dm = await this.prisma.chatConversation.findFirst({
      where: { orgId, dmKey },
      select: { id: true },
    });
    if (!dm) {
      dm = await this.prisma.chatConversation.create({
        data: {
          orgId,
          type: 'DM',
          dmKey,
          createdById: botUser.userId,
          members: {
            createMany: {
              data: ids.map(userId => ({ userId })),
              skipDuplicates: true,
            },
          },
        },
        select: { id: true },
      });
    }

    const msgId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const message = await this.prisma.chatMessage.create({
      data: {
        id: msgId,
        conversationId: dm.id,
        authorId: botUser.userId,
        content,
        isCopilot: true,
      },
      include: aiMessageInclude,
    });
    await this.prisma.chatConversation.update({
      where: { id: dm.id },
      data: { updatedAt: new Date() },
    });
    await this.realtimeEvents.publish({
      domain: RealtimeDomain.CHAT,
      event: ChatRealtimeEvent.MESSAGE_CREATED,
      target: { orgId, conversationId: dm.id },
      payload: message,
    });
  }

  private async executeCreateTask(
    orgId: string,
    config: { title: string; status?: TaskStatus; priority?: TaskPriority; assigneeId?: string },
    context: AgentContext,
  ): Promise<void> {
    if (!config.title) {
      return;
    }

    const botUser = await this.prisma.workspaceMember.findFirst({
      where: { orgId, role: 'OWNER' },
      select: { userId: true },
    });
    if (!botUser) {
      return;
    }

    const title = config.title
      .replace('{task.title}', context.taskTitle ?? '')
      .replace('{user.name}', context.displayName ?? '');

    await this.prisma.task.create({
      data: {
        orgId,
        title,
        status: config.status ?? TaskStatus.TODO,
        priority: config.priority ?? TaskPriority.MEDIUM,
        assigneeId: config.assigneeId ?? null,
        sourceType: TaskSourceType.AI,
        createdBy: botUser.userId,
        createdByAi: true,
        aiReason: 'Created by automation rule',
      },
    });
  }

  private async executePostChannel(
    orgId: string,
    config: { channelId: string; message: string },
    context: AgentContext,
  ): Promise<void> {
    if (!config.channelId || !config.message) {
      return;
    }

    const botUser = await this.prisma.workspaceMember.findFirst({
      where: { orgId, role: 'OWNER' },
      select: { userId: true },
    });
    if (!botUser) {
      return;
    }

    const content = config.message
      .replace('{task.title}', context.taskTitle ?? '')
      .replace('{user.name}', context.displayName ?? '')
      .replace('{date}', new Date().toLocaleDateString());

    const msgId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const message = await this.prisma.chatMessage.create({
      data: {
        id: msgId,
        conversationId: config.channelId,
        authorId: botUser.userId,
        content,
        isCopilot: true,
      },
      include: aiMessageInclude,
    });
    await this.prisma.chatConversation.update({
      where: { id: config.channelId },
      data: { updatedAt: new Date() },
    });
    await this.realtimeEvents.publish({
      domain: RealtimeDomain.CHAT,
      event: ChatRealtimeEvent.MESSAGE_CREATED,
      target: { orgId, conversationId: config.channelId },
      payload: message,
    });
  }
}
