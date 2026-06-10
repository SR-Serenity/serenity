import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type { Job } from 'bullmq';
import Redis from 'ioredis';
import { AutomationEngineService } from './automation-engine.service';

type AutomationJob = { type: 'run-scheduled'; ruleId: string };

@Injectable()
export class AutomationSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationSchedulerService.name);
  private queue: Queue<AutomationJob> | null = null;
  private worker: Worker<AutomationJob> | null = null;
  private redis: Redis | null = null;

  constructor(private readonly engine: AutomationEngineService) {}

  onModuleInit() {
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
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    this.redis?.disconnect();
  }

  registerJob(ruleId: string, cron: string): void {
    if (!this.queue) {
      return;
    }
    this.queue.upsertJobScheduler(
      ruleId,
      { pattern: cron },
      {
        name: 'run-scheduled',
        data: { type: 'run-scheduled', ruleId },
      },
    ).catch(err => this.logger.error(`Failed to register job for rule ${ruleId}: ${err}`));
  }

  unregisterJob(ruleId: string): void {
    if (!this.queue) {
      return;
    }
    this.queue.removeJobScheduler(ruleId)
      .catch(err => this.logger.warn(`Failed to unregister job for rule ${ruleId}: ${err}`));
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
}
