import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { RedisPublisherService } from './redis-publisher.service';
import type {
  PublishRealtimeEventInput,
  RealtimeEventMessage,
} from './config/types/realtime-event.type';

@Injectable()
export class RealtimeEventsService {
  constructor(private readonly redisPublisher: RedisPublisherService) {}

  async publish(input: PublishRealtimeEventInput) {
    const message: RealtimeEventMessage = {
      ...input,
      schemaVersion: 1,
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: input.event,
      orgId: input.target.orgId,
      userId: input.target.userId,
      conversationId: input.target.conversationId,
    };

    await this.redisPublisher.publish(
      this.channelFor(input),
      JSON.stringify(message),
    );
  }

  private channelFor(input: PublishRealtimeEventInput) {
    return `org:${input.target.orgId}:${input.domain}`;
  }
}
