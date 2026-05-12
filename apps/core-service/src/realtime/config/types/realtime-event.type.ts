import { ChatRealtimeEvent } from '../enums/chat-realtime-event.enum';
import { RealtimeDomain } from '../enums/realtime-domain.enum';

export type RealtimeEventTarget = {
  orgId: string;
  userId?: string;
  conversationId?: string;
};

export type RealtimeEventName = ChatRealtimeEvent;

export type PublishRealtimeEventInput = {
  domain: RealtimeDomain;
  event: RealtimeEventName;
  target: RealtimeEventTarget;
  payload: unknown;
};

export type RealtimeEventMessage = PublishRealtimeEventInput & {
  schemaVersion: number;
  eventId: string;
  timestamp: string;
  type: RealtimeEventName;
  orgId: string;
  userId?: string;
  conversationId?: string;
};
