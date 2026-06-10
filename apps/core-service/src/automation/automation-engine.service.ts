import { Injectable, Logger } from '@nestjs/common';
import { AutomationTriggerType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AutomationAgentService } from './automation-agent.service';

type ChatMessageContext = {
  conversationId: string;
  content: string;
  authorId: string;
};

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agent: AutomationAgentService,
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

    await this.agent.execute(rule, {
      orgId: rule.orgId,
      orgName: org?.name,
      triggerType: AutomationTriggerType.SCHEDULE,
    });
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
        await this.agent.execute(rule, {
          orgId,
          userId,
          displayName: user?.displayName,
          orgName: org?.name,
          triggerType: AutomationTriggerType.MEMBER_JOINED,
        });
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
        const config = rule.triggerConfig as { keywords?: string[] };
        const keywords: string[] = config.keywords ?? [];
        const matched = keywords.some(kw => lowerContent.includes(kw.toLowerCase()));
        if (!matched) {
          continue;
        }

        await this.agent.execute(rule, {
          orgId,
          conversationId: message.conversationId,
          messageContent: message.content,
          userId: message.authorId,
          triggerType: AutomationTriggerType.MESSAGE_KEYWORD,
        });
      } catch (err) {
        this.logger.error(`Failed executing rule ${rule.id} on message_keyword: ${err}`);
      }
    }
  }
}
