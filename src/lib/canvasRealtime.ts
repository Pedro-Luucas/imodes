'use client';

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/lib/supabaseClient';
import type { CanvasCard, CanvasState, PostItNote, DrawPath } from '@/types/canvas';

export const canvasChannelName = (sessionId: string) => `session:${sessionId}:canvas`;

export type CanvasRealtimeEventType =
  | 'card.add'
  | 'card.patch'
  | 'card.remove'
  | 'note.add'
  | 'note.patch'
  | 'note.remove'
  | 'drawPath.add'
  | 'drawPath.patch'
  | 'drawPath.remove'
  | 'state.snapshot'
  | 'state.request';

export interface CanvasRealtimePayloadMap {
  'card.add': { card: CanvasCard };
  'card.patch': { id: string; patch: Partial<CanvasCard> };
  'card.remove': { id: string };
  'note.add': { note: PostItNote };
  'note.patch': { id: string; patch: Partial<PostItNote> };
  'note.remove': { id: string };
  'drawPath.add': { path: DrawPath };
  'drawPath.patch': { id: string; patch: Partial<DrawPath> };
  'drawPath.remove': { id: string };
  'state.snapshot': { state: CanvasState; origin: 'autosave' | 'resync' | 'manual' };
  'state.request': { sinceVersion?: number };
}

export type CanvasRealtimeEvent<E extends CanvasRealtimeEventType = CanvasRealtimeEventType> = {
  type: E;
  sessionId: string;
  clientId: string;
  timestamp: string;
  version?: number;
  payload: CanvasRealtimePayloadMap[E];
};

export type CanvasRealtimeHandler<E extends CanvasRealtimeEventType = CanvasRealtimeEventType> = (
  event: CanvasRealtimeEvent<E>
) => void;

export type CanvasRealtimeHandlers = {
  [K in CanvasRealtimeEventType]?: CanvasRealtimeHandler<K>;
};

let supabaseClient: SupabaseClient | null = null;

export const getCanvasSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient();
  }
  return supabaseClient;
};

export interface CanvasChannelContext {
  supabase: SupabaseClient;
  channel: RealtimeChannel;
}

export const createCanvasChannel = (sessionId: string): CanvasChannelContext => {
  const supabase = getCanvasSupabaseClient();
  const channel = supabase.channel(canvasChannelName(sessionId), {
    config: {
      broadcast: { ack: true },
    },
  });

  return { supabase, channel };
};

export const subscribeToCanvasChannel = (
  channel: RealtimeChannel,
  handlers: CanvasRealtimeHandlers,
  options?: { onStatusChange?: (status: RealtimeChannel['state']) => void }
) => {
  type CanvasRealtimeEventBase = Omit<CanvasRealtimeEvent, 'type'>;

  const dispatchEvent = <E extends CanvasRealtimeEventType>(
    type: E,
    payload: CanvasRealtimeEventBase
  ) => {
    const handler = handlers[type] as CanvasRealtimeHandler<E> | undefined;
    if (!handler) {
      return;
    }

    const event: CanvasRealtimeEvent<E> = {
      type,
      sessionId: payload.sessionId,
      clientId: payload.clientId,
      timestamp: payload.timestamp,
      version: payload.version,
      payload: payload.payload as CanvasRealtimePayloadMap[E],
    };

    handler(event);
  };

  channel.on('broadcast', { event: '*' }, (payload) => {
    const eventType = payload.event as CanvasRealtimeEventType;
    if (!eventType || !handlers[eventType]) {
      return;
    }

    const eventPayload = payload.payload as CanvasRealtimeEventBase | undefined;
    if (!eventPayload) {
      return;
    }

    dispatchEvent(eventType, eventPayload);
  });

  const subscription = channel.subscribe((status) => {
    options?.onStatusChange?.(status as unknown as RealtimeChannel['state']);
  });

  return subscription;
};

export interface BroadcastCanvasEventArgs<E extends CanvasRealtimeEventType> {
  channel: RealtimeChannel;
  sessionId: string;
  clientId: string;
  type: E;
  payload: CanvasRealtimePayloadMap[E];
  version?: number;
}

export const broadcastCanvasEvent = async <E extends CanvasRealtimeEventType>({
  channel,
  sessionId,
  clientId,
  type,
  payload,
  version,
}: BroadcastCanvasEventArgs<E>) => {
  const message: CanvasRealtimeEvent<E> = {
    type,
    sessionId,
    clientId,
    timestamp: new Date().toISOString(),
    version,
    payload,
  };

  return channel.send({
    type: 'broadcast',
    event: type,
    payload: message,
  });
};


