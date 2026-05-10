import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisPublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisPublisherService.name);
  private readonly redisUrl = process.env.REDIS_URL;
  private client: Redis | null = null;

  async publish(channel: string, payload: string) {
    if (!this.redisUrl) {
      return;
    }

    try {
      const client = this.getClient();
      await client.publish(channel, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Redis error';
      this.logger.warn(`Unable to publish to Redis channel ${channel}: ${message}`);
    }
  }

  async onModuleDestroy() {
    if (!this.client) {
      return;
    }
    await this.client.quit();
    this.client = null;
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }
    if (!this.redisUrl) {
      throw new Error('REDIS_URL is not configured');
    }

    this.client = new Redis(this.redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      retryStrategy: times => Math.min(times * 200, 2000),
    });
    this.client.on('error', error => {
      this.logger.warn(`Redis publisher error: ${error.message}`);
    });

    return this.client;
  }
}
