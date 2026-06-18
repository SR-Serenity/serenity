import { Injectable, NotFoundException } from '@nestjs/common';
import { AutomationTriggerType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { CreateAutomationRuleDto, StepsGraph, UpdateAutomationRuleDto } from './dto/automation.dto';
import { AutomationSchedulerService } from './automation-scheduler.service';

@Injectable()
export class AutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: AutomationSchedulerService,
  ) {}

  async listRules(orgId: string) {
    const rules = await this.prisma.automationRule.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
    return { rules };
  }

  async createRule(orgId: string, dto: CreateAutomationRuleDto) {
    const { triggerType, triggerConfig } = dto.stepsGraph
      ? this.extractTriggerFromGraph(dto.stepsGraph, dto.triggerType, dto.triggerConfig)
      : { triggerType: dto.triggerType, triggerConfig: dto.triggerConfig };

    const rule = await this.prisma.automationRule.create({
      data: {
        orgId,
        name: dto.name,
        triggerType,
        triggerConfig: (triggerConfig ?? {}) as Prisma.InputJsonValue,
        actionType: dto.actionType,
        actionConfig: dto.actionConfig as Prisma.InputJsonValue,
        stepsGraph: dto.stepsGraph ? (dto.stepsGraph as unknown as Prisma.InputJsonValue) : undefined,
      },
    });

    if (rule.enabled && rule.triggerType === AutomationTriggerType.SCHEDULE) {
      const config = rule.triggerConfig as { cron?: string };
      if (config.cron) {
        this.scheduler.registerJob(rule.id, config.cron);
      }
    }

    return rule;
  }

  async updateRule(orgId: string, ruleId: string, dto: UpdateAutomationRuleDto) {
    const existing = await this.findRule(orgId, ruleId);

    let resolvedTriggerType = dto.triggerType;
    let resolvedTriggerConfig = dto.triggerConfig;
    if (dto.stepsGraph) {
      const extracted = this.extractTriggerFromGraph(
        dto.stepsGraph,
        dto.triggerType ?? existing.triggerType,
        dto.triggerConfig,
      );
      resolvedTriggerType = extracted.triggerType;
      resolvedTriggerConfig = extracted.triggerConfig;
    }

    const rule = await this.prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(resolvedTriggerType !== undefined && { triggerType: resolvedTriggerType }),
        ...(resolvedTriggerConfig !== undefined && {
          triggerConfig: resolvedTriggerConfig as Prisma.InputJsonValue,
        }),
        ...(dto.actionType !== undefined && { actionType: dto.actionType }),
        ...(dto.actionConfig !== undefined && {
          actionConfig: dto.actionConfig as Prisma.InputJsonValue,
        }),
        ...(dto.stepsGraph !== undefined && {
          stepsGraph: dto.stepsGraph as unknown as Prisma.InputJsonValue,
        }),
      },
    });

    const wasCronRule = existing.triggerType === AutomationTriggerType.SCHEDULE;
    const isCronRule = rule.triggerType === AutomationTriggerType.SCHEDULE;

    if (wasCronRule) {
      this.scheduler.unregisterJob(ruleId);
    }
    if (isCronRule && rule.enabled) {
      const config = rule.triggerConfig as { cron?: string };
      if (config.cron) {
        this.scheduler.registerJob(rule.id, config.cron);
      }
    }

    return rule;
  }

  async toggleRule(orgId: string, ruleId: string, enabled: boolean) {
    await this.findRule(orgId, ruleId);

    const rule = await this.prisma.automationRule.update({
      where: { id: ruleId },
      data: { enabled },
    });

    if (rule.triggerType === AutomationTriggerType.SCHEDULE) {
      const config = rule.triggerConfig as { cron?: string };
      if (enabled && config.cron) {
        this.scheduler.registerJob(rule.id, config.cron);
      } else {
        this.scheduler.unregisterJob(rule.id);
      }
    }

    return rule;
  }

  async deleteRule(orgId: string, ruleId: string) {
    const rule = await this.findRule(orgId, ruleId);

    if (rule.triggerType === AutomationTriggerType.SCHEDULE) {
      this.scheduler.unregisterJob(ruleId);
    }

    await this.prisma.automationRule.delete({ where: { id: ruleId } });
    return { success: true };
  }

  private async findRule(orgId: string, ruleId: string) {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id: ruleId, orgId },
    });
    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }
    return rule;
  }

  private extractTriggerFromGraph(
    graph: StepsGraph,
    fallbackTriggerType: AutomationTriggerType,
    fallbackTriggerConfig?: Record<string, unknown>,
  ): { triggerType: AutomationTriggerType; triggerConfig: Record<string, unknown> | undefined } {
    const triggerNode = graph.nodes.find(n => n.type === 'trigger');
    if (!triggerNode) {
      return { triggerType: fallbackTriggerType, triggerConfig: fallbackTriggerConfig };
    }
    return {
      triggerType: triggerNode.nodeType as AutomationTriggerType,
      triggerConfig: triggerNode.config,
    };
  }
}
