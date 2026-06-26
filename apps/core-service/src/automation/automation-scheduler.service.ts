import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AutomationTriggerType } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import type { Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '../database/prisma.service';
import { AutomationEngineService } from './automation-engine.service';

type AutomationJob = { type: 'run-scheduled'; ruleId: string };
type ScheduleConfig = { cron?: string; timeZone?: string; timezone?: string; tz?: string };

@Injectable()
export class AutomationSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationSchedulerService.name);
  private queue: Queue<AutomationJob> | null = null;
  private worker: Worker<AutomationJob> | null = null;
  private redis: Redis | null = null;

  constructor(
    private readonly engine: AutomationEngineService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const connection = this.buildConnection();
    if (!connection) {
      this.logger.warn('REDIS_URL not configured; automation scheduler disabled');
      return;
    }
    this.queue = new Queue<AutomationJob>('automation', { connection });
    this.worker = new Worker<AutomationJob>(
      'automation',
      (job) => this.process(job),
      { connection, concurrency: 2 },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.warn(`Automation job failed ${job?.id ?? 'unknown'}: ${err.message}`);
    });
    try {
      await this.registerPersistedJobs();
    } catch (err) {
      this.logger.error(`Failed to register persisted automation jobs: ${err}`);
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    this.redis?.disconnect();
  }

  async registerJob(ruleId: string, cron: string, timeZone?: string): Promise<void> {
    if (!this.queue) {
      return;
    }
    try {
      await this.queue.upsertJobScheduler(
        ruleId,
        { pattern: cron, ...(timeZone ? { tz: timeZone } : {}) },
        {
          name: 'run-scheduled',
          data: { type: 'run-scheduled', ruleId },
        },
      );
    } catch (err) {
      this.logger.error(`Failed to register job for rule ${ruleId}: ${err}`);
    }
  }

  async unregisterJob(ruleId: string): Promise<void> {
    if (!this.queue) {
      return;
    }
    try {
      await this.queue.removeJobScheduler(ruleId);
    } catch (err) {
      this.logger.warn(`Failed to unregister job for rule ${ruleId}: ${err}`);
    }
  }

  private async process(job: Job<AutomationJob>): Promise<void> {
    if (job.data.type === 'run-scheduled') {
      await this.engine.runScheduled(job.data.ruleId);
    }
  }

  private buildConnection(): Redis | null {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return null;
    }
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
    return this.redis;
  }

  private async registerPersistedJobs(): Promise<void> {
    const rules = await this.prisma.automationRule.findMany({
      where: { triggerType: AutomationTriggerType.SCHEDULE, enabled: true },
      select: { id: true, triggerConfig: true },
    });

    for (const rule of rules) {
      const config = rule.triggerConfig as ScheduleConfig;
      if (config.cron) {
        await this.registerJob(rule.id, config.cron, this.timeZoneFromConfig(config));
      }
    }
  }

  private timeZoneFromConfig(config: ScheduleConfig): string | undefined {
    return config.timeZone ?? config.timezone ?? config.tz;
  }
}
