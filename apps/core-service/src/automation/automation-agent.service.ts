import { Injectable, Logger } from '@nestjs/common';
import type { AutomationRule } from '@prisma/client';
import { AutomationTriggerType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type AgentContext = {
  orgId: string;
  userId?: string;
  displayName?: string;
  conversationId?: string;
  messageContent?: string;
  orgName?: string;
};

type ActionConfig = {
  instruction: string;
  targetType: 'CHANNEL' | 'DM_TRIGGER_USER';
  targetId?: string;
};

@Injectable()
export class AutomationAgentService {
  private readonly logger = new Logger(AutomationAgentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(rule: AutomationRule, context: AgentContext): Promise<void> {
    const actionConfig = rule.actionConfig as ActionConfig;
    if (!actionConfig?.instruction) {
      this.logger.warn(`Rule ${rule.id} has no instruction in actionConfig`);
      return;
    }

    const interpolated = this.interpolate(actionConfig.instruction, context);
    const response = await this.callAi(interpolated, context);
    if (!response) {
      return;
    }

    await this.postMessage(rule, actionConfig, context, response);
  }

  private interpolate(template: string, ctx: AgentContext): string {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    return template
      .replace(/\{date\}/g, date)
      .replace(/\{user\.name\}/g, ctx.displayName ?? 'the new member')
      .replace(/\{org\.name\}/g, ctx.orgName ?? 'the workspace');
  }

  private async callAi(instruction: string, context: AgentContext): Promise<string | null> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not configured; skipping AI agent execution');
      return null;
    }

    const systemPrompt = [
      'You are a helpful workspace assistant bot for a team communication platform.',
      'Write concise, friendly, professional messages.',
      'Do not include meta-commentary. Just write the message content directly.',
      context.orgName ? `Workspace: ${context.orgName}` : '',
    ].filter(Boolean).join('\n');

    const userPrompt = context.messageContent
      ? `${instruction}\n\nContext message: "${context.messageContent}"`
      : instruction;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!res.ok) {
        this.logger.error(`Anthropic API error ${res.status}: ${await res.text()}`);
        return null;
      }

      const data = await res.json() as { content: { type: string; text: string }[] };
      return data.content.find(b => b.type === 'text')?.text ?? null;
    } catch (err) {
      this.logger.error(`Failed to call Anthropic API: ${err}`);
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
    } else if (rule.triggerType === AutomationTriggerType.MESSAGE_KEYWORD && context.conversationId) {
      conversationId = context.conversationId;
    }

    if (!conversationId) {
      this.logger.warn(`Could not determine target conversation for rule ${rule.id}`);
      return;
    }

    const msgId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await this.prisma.chatMessage.create({
      data: { id: msgId, conversationId, authorId: botUserId, content },
    });

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
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
    targetUserId: string
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
