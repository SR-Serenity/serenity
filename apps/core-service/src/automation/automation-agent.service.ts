import { Injectable, Logger } from '@nestjs/common';
import type { AutomationRule } from '@prisma/client';
import { AutomationTriggerType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { RealtimeDomain } from '../realtime/config/enums/realtime-domain.enum';
import { ChatRealtimeEvent } from '../realtime/config/enums/chat-realtime-event.enum';

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

export type AgentContext = {
  orgId: string;
  userId?: string;
  displayName?: string;
  conversationId?: string;
  messageContent?: string;
  orgName?: string;
  triggerType?: string;
  taskId?: string;
  taskTitle?: string;
  taskStatus?: string;
  taskPriority?: string;
};

type ActionConfig = {
  instruction: string;
  targetType: 'CHANNEL' | 'DM_TRIGGER_USER';
  targetId?: string;
  useWebSearch?: boolean;
};

@Injectable()
export class AutomationAgentService {
  private readonly logger = new Logger(AutomationAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  async execute(
    rule: AutomationRule,
    context: AgentContext,
    overrideConfig?: ActionConfig,
  ): Promise<void> {
    const actionConfig = overrideConfig ?? rule.actionConfig as ActionConfig;
    if (!actionConfig?.instruction) {
      this.logger.warn(`Rule ${rule.id} has no instruction in actionConfig`);
      return;
    }

    const content = await this.callAiService(
      rule.orgId,
      actionConfig.instruction,
      context,
      actionConfig.useWebSearch ?? false,
    );
    if (!content) {
      return;
    }

    await this.postMessage(rule, actionConfig, context, content);
  }

  private async callAiService(
    orgId: string,
    instruction: string,
    context: AgentContext,
    useWebSearch = false,
  ): Promise<string | null> {
    const aiBaseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8001/api/internal/v1';
    const internalToken = process.env.AI_INTERNAL_API_TOKEN ?? '';

    const payload = {
      orgId,
      instruction,
      useWebSearch,
      context: {
        triggerType: context.triggerType,
        userId: context.userId,
        displayName: context.displayName,
        orgName: context.orgName,
        messageContent: context.messageContent,
        taskTitle: context.taskTitle,
        taskStatus: context.taskStatus,
      },
    };

    try {
      const res = await fetch(`${aiBaseUrl}/ai/automation/execute`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-api-token': internalToken,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        this.logger.error(`AI service error ${res.status}: ${await res.text()}`);
        return null;
      }

      const data = await res.json() as { content: string };
      return data.content ?? null;
    } catch (err) {
      this.logger.error(`Failed to call AI service: ${err}`);
      return null;
    }
  }

  private async postMessage(
    rule: AutomationRule,
    actionConfig: ActionConfig,
    context: AgentContext,
    content: string,
  ): Promise<void> {
    const botUserId = await this.getBotUserId(rule.orgId);
    if (!botUserId) {
      this.logger.warn(`No bot user found for org ${rule.orgId}`);
      return;
    }

    let conversationId: string | null = null;

    if (actionConfig.targetType === 'DM_TRIGGER_USER' && context.userId) {
      conversationId = await this.ensureDm(rule.orgId, botUserId, context.userId);
    } else if (actionConfig.targetType === 'CHANNEL' && actionConfig.targetId) {
      conversationId = actionConfig.targetId;
    // eslint-disable-next-line max-len
    } else if (rule.triggerType === AutomationTriggerType.MESSAGE_KEYWORD && context.conversationId) {
      conversationId = context.conversationId;
    }

    if (!conversationId) {
      this.logger.warn(`Could not determine target conversation for rule ${rule.id}`);
      return;
    }

    const msgId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const message = await this.prisma.chatMessage.create({
      data: { id: msgId, conversationId, authorId: botUserId, content, isCopilot: true },
      include: aiMessageInclude,
    });

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    await this.realtimeEvents.publish({
      domain: RealtimeDomain.CHAT,
      event: ChatRealtimeEvent.MESSAGE_CREATED,
      target: { orgId: rule.orgId, conversationId },
      payload: message,
    });
  }

  private async getBotUserId(orgId: string): Promise<string | null> {
    const owner = await this.prisma.workspaceMember.findFirst({
      where: { orgId, role: 'OWNER' },
      select: { userId: true },
    });
    return owner?.userId ?? null;
  }

  private async ensureDm(
    orgId: string,
    botUserId: string,
    targetUserId: string,
  ): Promise<string | null> {
    const ids = [botUserId, targetUserId].sort();
    const dmKey = ids.join(':');

    const existing = await this.prisma.chatConversation.findFirst({
      where: { orgId, dmKey },
      select: { id: true },
    });
    if (existing) {
      return existing.id;
    }

    const dm = await this.prisma.chatConversation.create({
      data: {
        orgId,
        type: 'DM',
        dmKey,
        createdById: botUserId,
        members: {
          createMany: {
            data: ids.map(userId => ({ userId })),
            skipDuplicates: true,
          },
        },
      },
      select: { id: true },
    });
    return dm.id;
  }
}
