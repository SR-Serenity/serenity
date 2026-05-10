import { sign } from 'jsonwebtoken';
import { ChatRealtimeEvent } from './config/enums/chat-realtime-event.enum';
import { RealtimeSystemEvent } from './config/enums/realtime-system-event.enum';
import type { SseEvent } from './config/types/realtime.type';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  const originalRedisUrl = process.env.REDIS_URL;
  const originalJwtSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.REDIS_URL = originalRedisUrl;
    process.env.JWT_SECRET = originalJwtSecret;
    jest.restoreAllMocks();
  });

  it('verifies token workspace context', () => {
    process.env.JWT_SECRET = 'secret';
    const service = new RealtimeService({ subscribe: jest.fn() } as never);
    const token = sign({ user_id: 'user_1', org_id: 'org_1' }, 'secret');

    expect(service.verifyToken(token)).toEqual({
      userId: 'user_1',
      orgId: 'org_1',
    });
  });

  it('subscribes to chat channel, forwards Redis events, and disposes on unsubscribe', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const dispose = jest.fn().mockResolvedValue(undefined);
    let redisListener: ((message: string) => void) | undefined;
    const redisSubscriber = {
      subscribe: jest.fn((channel: string, listener: (message: string) => void) => {
        redisListener = listener;
        return Promise.resolve({ dispose });
      }),
    };
    const service = new RealtimeService(redisSubscriber as never);
    const events: SseEvent[] = [];

    const subscription = service
      .streamEvents({ userId: 'user_1', orgId: 'org_1' })
      .subscribe(event => events.push(event));
    await Promise.resolve();
    await Promise.resolve();

    expect(redisSubscriber.subscribe).toHaveBeenCalledWith(
      'org:org_1:chat',
      expect.any(Function),
    );

    redisListener?.(JSON.stringify({
      domain: 'chat',
      event: ChatRealtimeEvent.MESSAGE_CREATED,
      type: ChatRealtimeEvent.MESSAGE_CREATED,
      target: { orgId: 'org_1', conversationId: 'conversation_1' },
      payload: { id: 'message_1' },
    }));

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: RealtimeSystemEvent.READY }),
      expect.objectContaining({ type: ChatRealtimeEvent.MESSAGE_CREATED }),
    ]));

    subscription.unsubscribe();
    await Promise.resolve();

    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
