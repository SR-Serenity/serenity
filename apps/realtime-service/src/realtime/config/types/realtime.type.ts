import { ChatRealtimeEvent } from '../enums/chat-realtime-event.enum';
import { RealtimeDomain } from '../enums/realtime-domain.enum';
import { RealtimeSystemEvent } from '../enums/realtime-system-event.enum';

export type RealtimeUser = {
  userId: string;
  orgId: string;
};

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

export type SseEvent = {
  type?: RealtimeSystemEvent | RealtimeEventName | string;
  data: unknown;
};

export type RealtimeEventMessage = {
  schemaVersion?: number;
  eventId?: string;
  timestamp?: string;
  domain?: RealtimeDomain;
  event?: RealtimeEventName | string;
  target?: RealtimeEventTarget;
  type?: RealtimeEventName | string;
  orgId?: string;
  userId?: string;
  conversationId?: string;
  payload?: unknown;
  raw?: string;
};
