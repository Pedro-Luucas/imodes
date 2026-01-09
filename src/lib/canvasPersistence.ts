'use client';

import type { CanvasState } from '@/types/canvas';
import { serializeCanvasState } from '@/lib/canvasSerialization';
import { canvasStore, type CanvasSaveReason } from '@/stores/canvasStore';

export interface PersistCanvasChangesResult {
  saved: boolean;
  reasons: CanvasSaveReason[];
  snapshot?: CanvasState;
  version?: number;
  updatedAt?: string;
}

const buildSnapshotFromStore = (version: number, updatedAt: string): CanvasState => {
  const state = canvasStore.getState();
  return serializeCanvasState({
    cards: state.cards,
    textElements: state.textElements,
    postItElements: state.postItElements,
    gender: state.gender,
    patientZoomLevel: state.patientZoomLevel,
    therapistZoomLevel: state.therapistZoomLevel,
    therapistNotes: state.therapistNotes,
    version,
    updatedAt,
    drawPaths: state.drawPaths,
  });
};

export const persistCanvasChanges = async (
  sessionId: string,
  reasons: CanvasSaveReason[],
  options?: { force?: boolean }
): Promise<PersistCanvasChangesResult> => {
  if (!sessionId) {
    return { saved: false, reasons: [] };
  }

  const effectiveReasons = reasons.filter(Boolean);
  if (!options?.force && effectiveReasons.length === 0) {
    return { saved: false, reasons: [] };
  }

  const state = canvasStore.getState();
  const version = state.lastSavedVersion + 1;
  const updatedAt = new Date().toISOString();
  const snapshot = buildSnapshotFromStore(version, updatedAt);

  // Handle demo sessions (save to localStorage instead of DB)
  if (sessionId.startsWith('demo-')) {
    try {
      const { saveDemoSession, isDemoSession } = await import('@/lib/demoSessionStorage');
      
      if (isDemoSession(sessionId)) {
        saveDemoSession(sessionId, snapshot);
        canvasStore.getState().setLastPersistedVersion(version, updatedAt);

        return {
          saved: true,
          reasons: effectiveReasons,
          snapshot,
          version,
          updatedAt,
        };
      }
    } catch (error) {
      console.error('Error saving demo session to localStorage:', error);
      return { saved: false, reasons: effectiveReasons };
    }
  }

  // Regular sessions: save to database (now via queue)
  try {
    console.log('[Canvas Persistence] 💾 Salvando alterações do canvas:', {
      sessionId,
      reasons: effectiveReasons,
      version,
      hasSnapshot: !!snapshot,
    });

    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: snapshot,
        reasons: effectiveReasons,
      }),
    });

    console.log('[Canvas Persistence] 📡 Resposta do servidor:', {
      status: response.status,
      statusText: response.statusText,
      sessionId,
    });

    // Handle 202 Accepted (message queued) as success
    if (response.status === 202) {
      console.log('[Canvas Persistence] ✅ Mensagem enfileirada (202 Accepted):', {
        sessionId,
        version,
        timestamp: updatedAt,
      });
      
      // Message was successfully queued
      // Use current timestamp as persistedAt since actual persistence happens async
      canvasStore.getState().setLastPersistedVersion(version, updatedAt);

      return {
        saved: true,
        reasons: effectiveReasons,
        snapshot,
        version,
        updatedAt,
      };
    }

    // Handle 200 OK (fallback direct update)
    if (response.ok) {
      const payload = await response.json();
      const persistedAt: string =
        typeof payload?.session?.updated_at === 'string' ? payload.session.updated_at : updatedAt;

      canvasStore.getState().setLastPersistedVersion(version, persistedAt);

      return {
        saved: true,
        reasons: effectiveReasons,
        snapshot,
        version,
        updatedAt: persistedAt,
      };
    }

    // Handle errors
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to persist canvas changes');
  } catch (error) {
    // Requeue reasons so they can be retried later
    effectiveReasons.forEach((reason) => canvasStore.getState().markDirty(reason));
    throw error;
  }
};

export const flushCanvasChanges = async (
  sessionId: string,
  options?: { force?: boolean; extraReasons?: CanvasSaveReason[] }
) => {
  const consumedReasons = canvasStore.getState().consumeDirtyReasons();
  const reasons = [...consumedReasons, ...(options?.extraReasons ?? [])];
  if (!options?.force && reasons.length === 0) {
    return { saved: false, reasons: [] } satisfies PersistCanvasChangesResult;
  }

  return persistCanvasChanges(sessionId, reasons, { force: options?.force });
};

export interface StartCanvasAutosaveOptions {
  sessionId?: string | null;
  intervalMs?: number;
  enabled?: boolean;
  onSave?: (result: PersistCanvasChangesResult) => void;
  onError?: (error: unknown, context: { reasons: CanvasSaveReason[] }) => void;
}

export const startCanvasAutosave = ({
  sessionId,
  intervalMs = 5000,
  enabled = true,
  onSave,
  onError,
}: StartCanvasAutosaveOptions) => {
  if (!sessionId || !enabled) {
    return () => undefined;
  }

  let disposed = false;

  const tick = async () => {
    if (!sessionId || disposed) return;
    const reasons = canvasStore.getState().consumeDirtyReasons();
    if (reasons.length === 0) {
      return;
    }

    try {
      const result = await persistCanvasChanges(sessionId, reasons);
      onSave?.(result);
    } catch (error) {
      onError?.(error, { reasons });
    }
  };

  const timer = window.setInterval(() => {
    void tick();
  }, intervalMs);

  return () => {
    if (!disposed) {
      disposed = true;
      window.clearInterval(timer);
    }
  };
};

export const buildSerializableCanvasState = () => {
  const state = canvasStore.getState();
  return serializeCanvasState({
    cards: state.cards,
    textElements: state.textElements,
    postItElements: state.postItElements,
    gender: state.gender,
    patientZoomLevel: state.patientZoomLevel,
    therapistZoomLevel: state.therapistZoomLevel,
    therapistNotes: state.therapistNotes,
    version: state.lastSavedVersion,
    updatedAt: state.lastUpdatedAt,
    drawPaths: state.drawPaths,
  });
};


