import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { Observable, Subscriber } from 'rxjs';
import { RealtimeDomain } from './config/enums/realtime-domain.enum';
import { RealtimeSystemEvent } from './config/enums/realtime-system-event.enum';
import type { RealtimeEventMessage, RealtimeUser, SseEvent } from './config/types/realtime.type';
import { RedisSubscriberService } from './redis-subscriber.service';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly redisEnabled = Boolean(process.env.REDIS_URL);

  constructor(private readonly redisSubscriber: RedisSubscriberService) {}

  verifyToken(token?: string): RealtimeUser {
    if (!token) {
      throw new UnauthorizedException('Missing realtime token');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT_SECRET is not configured');
    }

    const payload = verify(token, secret);
    if (!payload || typeof payload === 'string') {
      throw new UnauthorizedException('Invalid realtime token');
    }

    const decoded = payload as JwtPayload & {
      user_id?: string;
      org_id?: string;
    };
    const userId = decoded.user_id ?? decoded.sub;
    const orgId = decoded.org_id;

    if (!userId || !orgId || typeof userId !== 'string') {
      throw new UnauthorizedException('Realtime token is missing workspace context');
    }

    return { userId, orgId };
  }

  streamEvents(user: RealtimeUser): Observable<SseEvent> {
    return new Observable<SseEvent>(subscriber => {
      const heartbeat = setInterval(() => {
        subscriber.next({
          type: RealtimeSystemEvent.HEARTBEAT,
          data: { orgId: user.orgId, at: new Date().toISOString() },
        });
      }, 25_000);
      this.emit(subscriber, user, this.redisEnabled);

      if (this.redisEnabled) {
        this.subscribeToChannels(subscriber, user);
      }

      return () => clearInterval(heartbeat);
    });
  }

  private emit(
    subscriber: Subscriber<SseEvent>,
    user: RealtimeUser,
    redis: boolean,
  ) {
    subscriber.next({
      type: RealtimeSystemEvent.READY,
      data: { orgId: user.orgId, userId: user.userId, redis },
    });
  }

  private subscribeToChannels(
    subscriber: Subscriber<SseEvent>,
    user: RealtimeUser,
  ) {
    for (const channel of this.channelsForUser(user)) {
      this.redisSubscriber
        .subscribe(channel, message => {
          const event = this.parseEvent(message);
          subscriber.next({
            type: event.event ?? event.type,
            data: event,
          });
        })
        .then(handle => {
          subscriber.add(() => {
            void handle.dispose();
          });
        })
        .catch(error => this.handleSubscriptionError(subscriber, channel, error));
    }
  }

  private channelsForUser(user: RealtimeUser) {
    return [
      `org:${user.orgId}:${RealtimeDomain.CHAT}`,
      `org:${user.orgId}:${RealtimeDomain.OFFICE}`,
    ];
  }

  private handleSubscriptionError(
    subscriber: Subscriber<SseEvent>,
    channel: string,
    error: unknown,
  ) {
    const message = error instanceof Error ? error.message : 'Unknown Redis error';
    this.logger.warn(`Redis subscribe failed for ${channel}: ${message}`);
    subscriber.next({
      type: RealtimeSystemEvent.ERROR,
      data: { message: 'realtime.redis_unavailable' },
    });
  }

  private parseEvent(message: string): RealtimeEventMessage {
    try {
      const event = JSON.parse(message) as RealtimeEventMessage;
      return {
        ...event,
        event: event.event ?? event.type,
        target: event.target ?? {
          orgId: event.orgId ?? '',
          userId: event.userId,
          conversationId: event.conversationId,
        },
      };
    } catch {
      return { raw: message };
    }
  }
}
