import { ChatRealtimeEvent } from '../realtime/config/enums/chat-realtime-event.enum';
import { RealtimeDomain } from '../realtime/config/enums/realtime-domain.enum';
import { ChatEventsService } from './chat-events.service';

describe('ChatEventsService', () => {
  it('publishes chat events through the generic realtime publisher', async () => {
    const realtimeEvents = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ChatEventsService(realtimeEvents as never);

    await service.publish({
      event: ChatRealtimeEvent.REACTION_ADDED,
      orgId: 'org_1',
      conversationId: 'conversation_1',
      payload: { messageId: 'message_1' },
    });

    expect(realtimeEvents.publish).toHaveBeenCalledWith({
      domain: RealtimeDomain.CHAT,
      event: ChatRealtimeEvent.REACTION_ADDED,
      target: {
        orgId: 'org_1',
        conversationId: 'conversation_1',
      },
      payload: { messageId: 'message_1' },
    });
  });
});
