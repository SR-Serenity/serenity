import { Injectable } from '@nestjs/common';
import { OfficeRealtimeEvent } from '../realtime/config/enums/office-realtime-event.enum';
import { RealtimeDomain } from '../realtime/config/enums/realtime-domain.enum';
import { RealtimeEventsService } from '../realtime/realtime-events.service';

export type OfficeEvent = {
  event: OfficeRealtimeEvent;
  orgId: string;
  roomId: string;
  payload: unknown;
};

@Injectable()
export class OfficeEventsService {
  constructor(private readonly realtimeEvents: RealtimeEventsService) {}

  async publish(event: OfficeEvent) {
    await this.realtimeEvents.publish({
      domain: RealtimeDomain.OFFICE,
      event: event.event,
      target: {
        orgId: event.orgId,
        roomId: event.roomId,
      },
      payload: event.payload,
    });
  }
}
