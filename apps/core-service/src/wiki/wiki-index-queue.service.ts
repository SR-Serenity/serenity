import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type { Job } from 'bullmq';
import Redis from 'ioredis';
import { WikiIndexService } from './wiki-index.service';

type WikiIndexJob =
  | { type: 'index'; pageId: string }
  | { type: 'delete'; orgId: string; pageId: string };

@Injectable()
export class WikiIndexQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WikiIndexQueueService.name);
  private queue: Queue<WikiIndexJob> | null = null;
  private worker: Worker<WikiIndexJob> | null = null;
  private redis: Redis | null = null;

  constructor(private readonly indexer: WikiIndexService) {}

  onModuleInit() {
    const connection = this.connection();
    if (!connection) {
      this.logger.warn('REDIS_URL is not configured; wiki index jobs will run inline');
      return;
    }
    this.queue = new Queue<WikiIndexJob>('wiki-index', { connection });
    this.worker = new Worker<WikiIndexJob>(
      'wiki-index',
      (job) => this.process(job),
      { connection, concurrency: 2 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.warn(`Wiki index job failed ${job?.id ?? 'unknown'}: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    this.redis?.disconnect();
  }

  async enqueueIndex(pageId: string, delayMs = 30000) {
    if (!this.queue) {
      await this.indexer.indexPage(pageId);
      return;
    }
    const jobId = `wiki-index-${pageId}`;
    await this.removePending(jobId);
    await this.queue.add(
      'index',
      { type: 'index', pageId },
      {
        jobId,
        delay: delayMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
  }

  async enqueueDelete(orgId: string, pageId: string) {
    if (!this.queue) {
      await this.indexer.deletePage(orgId, pageId);
      return;
    }
    const jobId = `wiki-delete-${pageId}`;
    await this.removePending(jobId);
    await this.queue.add(
      'delete',
      { type: 'delete', orgId, pageId },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
  }

  private async process(job: Job<WikiIndexJob>) {
    if (job.data.type === 'delete') {
      await this.indexer.deletePage(job.data.orgId, job.data.pageId);
      return;
    }
    await this.indexer.indexPage(job.data.pageId);
  }

  private async removePending(jobId: string) {
    const job = await this.queue?.getJob(jobId);
    const state = await job?.getState();
    if (state === 'waiting' || state === 'delayed') {
      await job?.remove();
    }
    if (state === 'failed' || state === 'completed') {
      await job?.remove();
    }
  }

  private connection() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return null;
    }
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
    return this.redis;
  }
}
