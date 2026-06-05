import { Injectable } from '@nestjs/common';
import { ChatRealtimeEvent } from '../realtime/config/enums/chat-realtime-event.enum';
import { RealtimeDomain } from '../realtime/config/enums/realtime-domain.enum';
import { RealtimeEventsService } from '../realtime/realtime-events.service';

export type ChatEvent = {
  event: ChatRealtimeEvent;
  orgId: string;
  conversationId: string;
  payload: unknown;
};

@Injectable()
export class ChatEventsService {
  constructor(private readonly realtimeEvents: RealtimeEventsService) {}

  async publish(event: ChatEvent) {
    await this.realtimeEvents.publish({
      domain: RealtimeDomain.CHAT,
      event: event.event,
      target: {
        orgId: event.orgId,
        conversationId: event.conversationId,
      },
      payload: event.payload,
    });
  }
}
