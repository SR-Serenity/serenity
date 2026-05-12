import { ChatRealtimeEvent } from './config/enums/chat-realtime-event.enum';
import { RealtimeDomain } from './config/enums/realtime-domain.enum';
import { RealtimeEventsService } from './realtime-events.service';

describe('RealtimeEventsService', () => {
  it('publishes a compatible realtime event message to the domain channel', async () => {
    const redisPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RealtimeEventsService(redisPublisher as never);

    await service.publish({
      domain: RealtimeDomain.CHAT,
      event: ChatRealtimeEvent.MESSAGE_CREATED,
      target: {
        orgId: 'org_1',
        conversationId: 'conversation_1',
      },
      payload: { id: 'message_1' },
    });

    expect(redisPublisher.publish).toHaveBeenCalledWith(
      'org:org_1:chat',
      expect.any(String),
    );

    const [, rawMessage] = redisPublisher.publish.mock.calls[0];
    const message = JSON.parse(rawMessage);
    expect(message).toMatchObject({
      schemaVersion: 1,
      domain: RealtimeDomain.CHAT,
      event: ChatRealtimeEvent.MESSAGE_CREATED,
      type: ChatRealtimeEvent.MESSAGE_CREATED,
      target: {
        orgId: 'org_1',
        conversationId: 'conversation_1',
      },
      orgId: 'org_1',
      conversationId: 'conversation_1',
      payload: { id: 'message_1' },
    });
    expect(message.eventId).toEqual(expect.any(String));
    expect(message.timestamp).toEqual(expect.any(String));
  });
});
