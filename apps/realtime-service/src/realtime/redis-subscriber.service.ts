import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

type MessageListener = (message: string) => void;
type SubscriptionHandle = {
  dispose: () => Promise<void>;
};

@Injectable()
export class RedisSubscriberService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisSubscriberService.name);
  private readonly redisUrl = process.env.REDIS_URL;
  private client: Redis | null = null;
  private readonly listenersByChannel = new Map<string, Set<MessageListener>>();

  async subscribe(channel: string, listener: MessageListener): Promise<SubscriptionHandle> {
    if (!this.redisUrl) {
      return {
        dispose: () => Promise.resolve(),
      };
    }

    let listeners = this.listenersByChannel.get(channel);
    if (!listeners) {
      listeners = new Set<MessageListener>();
      this.listenersByChannel.set(channel, listeners);
      await this.getClient().subscribe(channel);
    }
    listeners.add(listener);

    return this.createSubscriptionHandle(channel, listener);
  }

  async onModuleDestroy() {
    if (!this.client) {
      return;
    }
    await this.client.quit();
    this.client = null;
    this.listenersByChannel.clear();
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }
    if (!this.redisUrl) {
      throw new Error('REDIS_URL is not configured');
    }

    this.client = new Redis(this.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: times => Math.min(times * 200, 2000),
    });

    this.client.on('message', (channel, message) => {
      const listeners = this.listenersByChannel.get(channel);
      if (!listeners) {
        return;
      }
      for (const listener of listeners) {
        listener(message);
      }
    });
    this.client.on('error', error => {
      this.logger.warn(`Redis subscriber error: ${error.message}`);
    });

    return this.client;
  }

  private createSubscriptionHandle(
    channel: string,
    listener: MessageListener,
  ): SubscriptionHandle {
    let disposed = false;

    return {
      dispose: async () => {
        if (disposed) {
          return;
        }
        disposed = true;

        await this.detachListener(channel, listener);
      },
    };
  }

  private async detachListener(channel: string, listener: MessageListener) {
    const listeners = this.listenersByChannel.get(channel);
    if (!listeners) {
      return;
    }

    listeners.delete(listener);
    if (listeners.size > 0) {
      return;
    }

    this.listenersByChannel.delete(channel);
    if (this.client) {
      await this.client.unsubscribe(channel);
    }
  }
}
