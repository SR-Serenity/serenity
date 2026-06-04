// @ts-nocheck
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type { Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { MailSyncService } from '../mail-sync.service';

type MailJob =
  | { type: 'sync'; accountId: string; mode?: 'initial' | 'incremental' | 'fallback' }
  | { type: 'renew-watch'; accountId: string };

@Injectable()
export class MailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailQueueService.name);
  private queue: Queue<MailJob> | null = null;
  private worker: Worker<MailJob> | null = null;
  private redis: Redis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: MailSyncService,
  ) {}

  onModuleInit() {
    const connection = this.connection();
    if (!connection) {
      this.logger.warn('REDIS_URL is not configured; mail jobs will run inline');
      return;
    }
    this.queue = new Queue<MailJob>('mail-sync', { connection });
    this.worker = new Worker<MailJob>(
      'mail-sync',
      (job) => this.process(job),
      { connection, concurrency: 2 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.warn(`Mail job failed ${job?.id ?? 'unknown'}: ${error.message}`);
    });
    void this.scheduleMaintenanceJobs();
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    this.redis?.disconnect();
  }

  async enqueueSync(accountId: string, mode: 'initial' | 'incremental' | 'fallback' = 'incremental') {
    if (!this.queue) {
      await this.sync.syncAccount(accountId, mode);
      return;
    }
    const jobId = `sync-${accountId}`;
    await this.removeTerminalJob(jobId);
    await this.queue.add(
      'sync',
      { type: 'sync', accountId, mode },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
  }

  async enqueueWatchRenewal(accountId: string) {
    if (!this.queue) {
      await this.sync.renewWatch(accountId);
      return;
    }
    const jobId = `renew-watch-${accountId}`;
    await this.removeTerminalJob(jobId);
    await this.queue.add(
      'renew-watch',
      { type: 'renew-watch', accountId },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
  }

  private async process(job: Job<MailJob>) {
    if (job.data.type === 'renew-watch') {
      if (job.data.accountId === 'all') {
        await this.processAll('renew-watch');
        return;
      }
      await this.sync.renewWatch(job.data.accountId);
      return;
    }
    if (job.data.accountId === 'all') {
      await this.processAll('sync');
      return;
    }
    await this.sync.syncAccount(job.data.accountId, job.data.mode ?? 'incremental');
  }

  private async removeTerminalJob(jobId: string) {
    const job = await this.queue?.getJob(jobId);
    const state = await job?.getState();
    if (state === 'failed' || state === 'completed') {
      await job.remove();
    }
  }

  private async scheduleMaintenanceJobs() {
    if (!this.queue) return;
    await this.queue.add(
      'fallback-sync',
      { type: 'sync', accountId: 'all', mode: 'fallback' },
      { repeat: { pattern: '*/45 * * * *' }, jobId: 'fallback-sync-all' },
    );
    await this.queue.add(
      'renew-watch',
      { type: 'renew-watch', accountId: 'all' },
      { repeat: { pattern: '0 */12 * * *' }, jobId: 'renew-watch-all' },
    );
  }

  private async processAll(type: 'sync' | 'renew-watch') {
    const accounts = await this.prisma.mailAccount.findMany({ select: { id: true } });
    for (const account of accounts) {
      if (type === 'sync') await this.sync.syncAccount(account.id, 'fallback');
      else await this.sync.renewWatch(account.id);
    }
  }

  private connection() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return null;
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
    return this.redis;
  }
}
