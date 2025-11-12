'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  createCanvasChannel,
  subscribeToCanvasChannel,
  broadcastCanvasEvent,
  type CanvasRealtimeEventType,
  type CanvasRealtimePayloadMap,
  type CanvasChannelContext,
  type CanvasRealtimeHandlers,
} from '@/lib/canvasRealtime';
import { canvasStore, useCanvasStore } from '@/stores/canvasStore';
import type { CanvasState } from '@/types/canvas';
import { buildSerializableCanvasState } from '@/lib/canvasPersistence';

interface UseCanvasRealtimeOptions {
  sessionId?: string | null;
  enabled?: boolean;
  onSnapshotApplied?: (snapshot: CanvasState) => void;
}

interface UseCanvasRealtimeReturn {
  status: RealtimeChannel['state'] | 'idle';
  publish: <E extends CanvasRealtimeEventType>(
    type: E,
    payload: CanvasRealtimePayloadMap[E],
    options?: { version?: number }
  ) => Promise<void>;
  requestSnapshot: (sinceVersion?: number) => Promise<void>;
  channel: RealtimeChannel | null;
}

export function useCanvasRealtime({
  sessionId,
  enabled = true,
  onSnapshotApplied,
}: UseCanvasRealtimeOptions): UseCanvasRealtimeReturn {
  const SUBSCRIBED_STATE = 'SUBSCRIBED' as RealtimeChannel['state'];
  const clientId = useCanvasStore((state) => state.clientId);
  const lastSavedVersion = useCanvasStore((state) => state.lastSavedVersion);
  const [status, setStatus] = useState<RealtimeChannel['state'] | 'idle'>('idle');
  const contextRef = useRef<CanvasChannelContext | null>(null);

  const cleanupChannel = useCallback(() => {
    const context = contextRef.current;
    if (context) {
      context.channel.unsubscribe();
      contextRef.current = null;
    }
    setStatus('idle');
  }, []);

  const publish = useCallback(
    async <E extends CanvasRealtimeEventType>(
      type: E,
      payload: CanvasRealtimePayloadMap[E],
      options?: { version?: number }
    ) => {
      const context = contextRef.current;
      if (!sessionId || !context) {
        return;
      }
      await broadcastCanvasEvent({
        channel: context.channel,
        sessionId,
        clientId,
        type,
        payload,
        version: options?.version,
      });
    },
    [clientId, sessionId]
  );

  const requestSnapshot = useCallback(
    async (sinceVersion?: number) => {
      if (!sessionId) return;
      await publish('state.request', { sinceVersion });
    },
    [publish, sessionId]
  );

  const handleSnapshotBroadcast = useCallback(
    (snapshot: CanvasState, version?: number, updatedAt?: string) => {
      const storeApi = canvasStore.getState();
      storeApi.markApplyingRemote(true);
      try {
        storeApi.applySnapshot(
          {
            ...snapshot,
            version,
            updatedAt,
          },
          { replaceHistory: true }
        );
        if (typeof version === 'number' && updatedAt) {
          storeApi.setLastPersistedVersion(version, updatedAt);
        }
        onSnapshotApplied?.(snapshot);
      } finally {
        storeApi.markApplyingRemote(false);
      }
    },
    [onSnapshotApplied]
  );

  useEffect(() => {
    if (!sessionId || !enabled) {
      cleanupChannel();
      return;
    }

    const context = createCanvasChannel(sessionId);
    contextRef.current = context;

    const handlers: CanvasRealtimeHandlers = {
      'card.add': (event) => {
        if (event.clientId === clientId || event.sessionId !== sessionId) return;
        const storeApi = canvasStore.getState();
        if (typeof event.version === 'number' && event.version < storeApi.lastSavedVersion) {
          return;
        }
        storeApi.markApplyingRemote(true);
        try {
          storeApi.addCard(event.payload.card, { skipHistory: true });
        } finally {
          storeApi.markApplyingRemote(false);
        }
      },
      'card.patch': (event) => {
        if (event.clientId === clientId || event.sessionId !== sessionId) return;
        const storeApi = canvasStore.getState();
        if (typeof event.version === 'number' && event.version < storeApi.lastSavedVersion) {
          return;
        }
        storeApi.markApplyingRemote(true);
        try {
          storeApi.updateCard(event.payload.id, event.payload.patch, { skipHistory: true });
        } finally {
          storeApi.markApplyingRemote(false);
        }
      },
      'card.remove': (event) => {
        if (event.clientId === clientId || event.sessionId !== sessionId) return;
        const storeApi = canvasStore.getState();
        storeApi.markApplyingRemote(true);
        try {
          storeApi.removeCard(event.payload.id, { skipHistory: true });
        } finally {
          storeApi.markApplyingRemote(false);
        }
      },
      'note.add': (event) => {
        if (event.clientId === clientId || event.sessionId !== sessionId) return;
        const storeApi = canvasStore.getState();
        storeApi.markApplyingRemote(true);
        try {
          storeApi.addNote(event.payload.note, { skipHistory: true });
        } finally {
          storeApi.markApplyingRemote(false);
        }
      },
      'note.patch': (event) => {
        if (event.clientId === clientId || event.sessionId !== sessionId) return;
        const storeApi = canvasStore.getState();
        storeApi.markApplyingRemote(true);
        try {
          storeApi.updateNote(event.payload.id, event.payload.patch, { skipHistory: true });
        } finally {
          storeApi.markApplyingRemote(false);
        }
      },
      'note.remove': (event) => {
        if (event.clientId === clientId || event.sessionId !== sessionId) return;
        const storeApi = canvasStore.getState();
        storeApi.markApplyingRemote(true);
        try {
          storeApi.removeNote(event.payload.id, { skipHistory: true });
        } finally {
          storeApi.markApplyingRemote(false);
        }
      },
      'state.snapshot': (event) => {
        if (event.clientId === clientId || event.sessionId !== sessionId) return;
        handleSnapshotBroadcast(event.payload.state, event.version, event.payload.state.updatedAt);
      },
      'state.request': async (event) => {
        if (event.sessionId !== sessionId) return;
        // Avoid responding to our own request
        if (event.clientId === clientId) return;

        const storeState = canvasStore.getState();
        if (
          typeof event.payload.sinceVersion === 'number' &&
          typeof storeState.lastSavedVersion === 'number' &&
          event.payload.sinceVersion >= storeState.lastSavedVersion
        ) {
          return;
        }

        const snapshot = buildSerializableCanvasState();
        await publish(
          'state.snapshot',
          {
            state: snapshot,
            origin: 'resync',
          },
          { version: storeState.lastSavedVersion }
        );
      },
    } as CanvasRealtimeHandlers;

    subscribeToCanvasChannel(context.channel, handlers, {
      onStatusChange: (channelState) => {
        setStatus(channelState);
        if (channelState === SUBSCRIBED_STATE) {
          void requestSnapshot(lastSavedVersion);
        }
      },
    });

    return () => {
      cleanupChannel();
    };
  }, [
    clientId,
    enabled,
    handleSnapshotBroadcast,
    lastSavedVersion,
    publish,
    requestSnapshot,
    sessionId,
    cleanupChannel,
  ]);

  return {
    status,
    publish,
    requestSnapshot,
    channel: contextRef.current?.channel ?? null,
  };
}


