'use client';

import { create } from 'zustand';
import type { CanvasCard, CanvasState, Gender, PostItNote, DrawPath } from '@/types/canvas';

const MAX_HISTORY_LENGTH = 50;

const createClientId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `canvas-client-${Math.random().toString(36).slice(2, 10)}`;
};

export type CanvasSaveReason = 'interaction' | 'autosave' | 'remote-sync' | 'manual';

export interface CanvasHistorySnapshot {
  cards: CanvasCard[];
  notes: PostItNote[];
  drawPaths: DrawPath[];
}

interface CanvasStoreState {
  sessionId: string | null;
  userRole: 'therapist' | 'patient' | null;
  clientId: string;

  cards: CanvasCard[];
  notes: PostItNote[];
  drawPaths: DrawPath[];
  gender: Gender;

  patientZoomLevel: number;
  therapistZoomLevel: number;
  therapistNotes?: string;

  displayScale: number;
  stagePosition: { x: number; y: number };

  selectedCardId: string | null;
  selectedNoteId: string | null;
  selectedDrawPathId: string | null;

  history: CanvasHistorySnapshot[];
  historyIndex: number;
  isApplyingRemote: boolean;
  isHydrated: boolean;

  pendingSaveReasons: CanvasSaveReason[];
  lastSavedVersion: number;
  lastUpdatedAt?: string;
}

interface CanvasStoreActions {
  reset: () => void;
  hydrateFromServer: (args: {
    sessionId: string;
    role: 'therapist' | 'patient';
    state: CanvasState | null;
    updatedAt?: string;
  }) => void;
  applySnapshot: (state: CanvasState, options?: { replaceHistory?: boolean }) => void;
  setSessionMetadata: (metadata: {
    sessionId?: string | null;
    role?: 'therapist' | 'patient' | null;
  }) => void;
  setDisplayScale: (scale: number) => void;
  setStagePosition: (position: { x: number; y: number }) => void;

  selectCard: (id: string | null) => void;
  selectNote: (id: string | null) => void;
  selectDrawPath: (id: string | null) => void;

  addCard: (card: CanvasCard, options?: { skipHistory?: boolean }) => void;
  updateCard: (id: string, patch: Partial<CanvasCard>, options?: { skipHistory?: boolean }) => void;
  removeCard: (id: string, options?: { skipHistory?: boolean }) => void;
  clearCanvas: (options?: { skipHistory?: boolean }) => void;
  bringCardToFront: (id: string, options?: { skipHistory?: boolean }) => void;

  addNote: (note: PostItNote, options?: { skipHistory?: boolean }) => void;
  updateNote: (id: string, patch: Partial<PostItNote>, options?: { skipHistory?: boolean }) => void;
  removeNote: (id: string, options?: { skipHistory?: boolean }) => void;
  bringNoteToFront: (id: string, options?: { skipHistory?: boolean }) => void;

  setDrawPaths: (paths: DrawPath[], options?: { skipHistory?: boolean }) => void;
  addDrawPath: (path: DrawPath, options?: { skipHistory?: boolean }) => void;
  updateDrawPath: (id: string, patch: Partial<DrawPath>, options?: { skipHistory?: boolean }) => void;
  removeDrawPath: (id: string, options?: { skipHistory?: boolean }) => void;

  setGender: (gender: Gender) => void;
  setZoomLevel: (role: 'therapist' | 'patient', zoomLevel: number) => void;
  setTherapistNotes: (notes: string | undefined) => void;

  markApplyingRemote: (applying: boolean) => void;
  saveHistorySnapshot: () => void;
  undo: () => void;
  redo: () => void;

  markDirty: (reason: CanvasSaveReason) => void;
  consumeDirtyReasons: () => CanvasSaveReason[];
  setLastPersistedVersion: (version: number, updatedAt?: string) => void;
}

export type CanvasStore = CanvasStoreState & CanvasStoreActions;

// Default zoom is 60% actual which displays as 100% (with +40 offset)
const initialState: CanvasStoreState = {
  sessionId: null,
  userRole: null,
  clientId: createClientId(),
  cards: [],
  notes: [],
  drawPaths: [],
  gender: 'male',
  patientZoomLevel: 60,
  therapistZoomLevel: 60,
  therapistNotes: undefined,
  displayScale: 0.6,
  stagePosition: { x: 0, y: 0 },
  selectedCardId: null,
  selectedNoteId: null,
  selectedDrawPathId: null,
  history: [],
  historyIndex: -1,
  isApplyingRemote: false,
  isHydrated: false,
  pendingSaveReasons: [],
  lastSavedVersion: 0,
  lastUpdatedAt: undefined,
};

const createSnapshot = (state: CanvasStoreState): CanvasHistorySnapshot => ({
  cards: state.cards.map((card) => ({ ...card })),
  notes: state.notes.map((note) => ({ ...note })),
  drawPaths: state.drawPaths.map((path) => ({ ...path })),
});

const pushHistory = (
  state: CanvasStoreState & { history: CanvasHistorySnapshot[]; historyIndex: number },
  snapshot: CanvasHistorySnapshot
) => {
  const history = state.history.slice(0, state.historyIndex + 1);
  history.push(snapshot);

  if (history.length > MAX_HISTORY_LENGTH) {
    history.shift();
  }

  return {
    history,
    historyIndex: history.length - 1,
  };
};

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  ...initialState,

  reset: () => {
    const clientId = get().clientId || createClientId();
    set({
      ...initialState,
      clientId,
    });
  },

  hydrateFromServer: ({ sessionId, role, state, updatedAt }) => {
    set((current) => {
      const cards = Array.isArray(state?.cards) ? state.cards.map((card) => ({ ...card })) : [];
      const notes = Array.isArray(state?.notes) ? state.notes.map((note) => ({ ...note })) : [];
      const gender = state?.gender ?? 'male';
      // Default zoom is 60% actual which displays as 100% (with +40 offset)
      const patientZoomLevel = state?.patientSettings?.zoomLevel ?? 60;
      const therapistZoomLevel = state?.therapistSettings?.zoomLevel ?? 60;
      const therapistNotes = state?.therapistSettings?.notes ?? current.therapistNotes;

      const snapshot = createSnapshot({
        ...current,
        cards,
        notes,
        drawPaths: Array.isArray(state?.drawPaths) ? state.drawPaths.map((path) => ({ ...path })) : [],
        gender,
      });

      const lastSavedVersion = typeof state?.version === 'number' ? state.version : 0;
      const lastUpdatedAt = typeof state?.updatedAt === 'string' ? state.updatedAt : updatedAt ?? current.lastUpdatedAt;

      return {
        ...current,
        sessionId,
        userRole: role,
        cards,
        notes,
        drawPaths: Array.isArray(state?.drawPaths) ? state.drawPaths.map((path) => ({ ...path })) : [],
        gender,
        patientZoomLevel,
        therapistZoomLevel,
        therapistNotes,
        history: [snapshot],
        historyIndex: 0,
        isHydrated: true,
        displayScale: role === 'patient' ? patientZoomLevel / 100 : therapistZoomLevel / 100,
        lastSavedVersion,
        lastUpdatedAt,
      };
    });
  },

  applySnapshot: (snapshotState, options) => {
    set((state) => {
      const cards = Array.isArray(snapshotState.cards)
        ? snapshotState.cards.map((card) => ({ ...card }))
        : [];
      const notes = Array.isArray(snapshotState.notes)
        ? snapshotState.notes.map((note) => ({ ...note }))
        : [];
      const gender = snapshotState.gender ?? state.gender;
      const patientZoomLevel = snapshotState.patientSettings?.zoomLevel ?? state.patientZoomLevel;
      const therapistZoomLevel =
        snapshotState.therapistSettings?.zoomLevel ?? state.therapistZoomLevel;
      const therapistNotes = snapshotState.therapistSettings?.notes ?? state.therapistNotes;

      const snapshot = createSnapshot({
        ...state,
        cards,
        notes,
        drawPaths: Array.isArray(snapshotState.drawPaths) ? snapshotState.drawPaths.map((path) => ({ ...path })) : [],
        gender,
      });

      const replaceHistory = options?.replaceHistory ?? true;

      return {
        ...state,
        cards,
        notes,
        drawPaths: Array.isArray(snapshotState.drawPaths) ? snapshotState.drawPaths.map((path) => ({ ...path })) : [],
        gender,
        patientZoomLevel,
        therapistZoomLevel,
        therapistNotes,
        history: replaceHistory ? [snapshot] : state.history,
        historyIndex: replaceHistory ? 0 : state.historyIndex,
        lastSavedVersion:
          typeof snapshotState.version === 'number' ? snapshotState.version : state.lastSavedVersion,
        lastUpdatedAt:
          typeof snapshotState.updatedAt === 'string'
            ? snapshotState.updatedAt
            : state.lastUpdatedAt,
        displayScale:
          state.userRole === 'patient'
            ? (patientZoomLevel ?? state.patientZoomLevel) / 100
            : (therapistZoomLevel ?? state.therapistZoomLevel) / 100,
      };
    });
  },

  setSessionMetadata: ({ sessionId, role }) => {
    set((state) => {
      const nextSessionId = sessionId ?? state.sessionId;
      const nextRole = role ?? state.userRole;
      if (nextSessionId === state.sessionId && nextRole === state.userRole) {
        return state;
      }
      return {
        ...state,
        sessionId: nextSessionId,
        userRole: nextRole,
      };
    });
  },

  setDisplayScale: (scale) => {
    set((state) => {
      if (state.displayScale === scale) {
        return state;
      }
      return {
        ...state,
        displayScale: scale,
      };
    });
  },

  setStagePosition: (position) => {
    set((state) => {
      if (
        state.stagePosition.x === position.x &&
        state.stagePosition.y === position.y
      ) {
        return state;
      }
      return {
        ...state,
        stagePosition: { ...position },
      };
    });
  },

  selectCard: (id) => {
    set((state) => ({
      ...state,
      selectedCardId: id,
      selectedNoteId: id ? null : state.selectedNoteId,
      selectedDrawPathId: id ? null : state.selectedDrawPathId,
    }));
  },

  selectNote: (id) => {
    set((state) => ({
      ...state,
      selectedNoteId: id,
      selectedCardId: id ? null : state.selectedCardId,
      selectedDrawPathId: id ? null : state.selectedDrawPathId,
    }));
  },

  selectDrawPath: (id) => {
    set((state) => ({
      ...state,
      selectedDrawPathId: id,
      selectedCardId: id ? null : state.selectedCardId,
      selectedNoteId: id ? null : state.selectedNoteId,
    }));
  },

  addCard: (card, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const cards = [...state.cards, { ...card }];
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, cards });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        cards,
        history,
        historyIndex,
      };
    });
  },

  updateCard: (id, patch, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const cards = state.cards.map((card) => (card.id === id ? { ...card, ...patch } : card));
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, cards });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        cards,
        history,
        historyIndex,
      };
    });
  },

  removeCard: (id, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const cards = state.cards.filter((card) => card.id !== id);
      let history = state.history;
      let historyIndex = state.historyIndex;
      const selectedCardId = state.selectedCardId === id ? null : state.selectedCardId;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, cards });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        cards,
        history,
        historyIndex,
        selectedCardId,
      };
    });
  },

  bringCardToFront: (id, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const index = state.cards.findIndex((card) => card.id === id);
      if (index === -1) {
        return state;
      }

      const cards = [...state.cards];
      const [selectedCard] = cards.splice(index, 1);
      cards.push(selectedCard);

      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({
          ...state,
          cards,
        });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        cards,
        history,
        historyIndex,
      };
    });
  },

  clearCanvas: (options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({
          ...state,
          cards: [],
          notes: [],
          drawPaths: [],
        });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }
      return {
        ...state,
        cards: [],
        notes: [],
        drawPaths: [],
        selectedCardId: null,
        selectedNoteId: null,
        history,
        historyIndex,
      };
    });
  },

  addNote: (note, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const notes = [...state.notes, { ...note }];
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, notes });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        notes,
        history,
        historyIndex,
      };
    });
  },

  updateNote: (id, patch, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const notes = state.notes.map((note) => (note.id === id ? { ...note, ...patch } : note));
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, notes });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        notes,
        history,
        historyIndex,
      };
    });
  },

  removeNote: (id, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const notes = state.notes.filter((note) => note.id !== id);
      let history = state.history;
      let historyIndex = state.historyIndex;
      const selectedNoteId = state.selectedNoteId === id ? null : state.selectedNoteId;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, notes });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        notes,
        history,
        historyIndex,
        selectedNoteId,
      };
    });
  },

  bringNoteToFront: (id, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const index = state.notes.findIndex((note) => note.id === id);
      if (index === -1) {
        return state;
      }

      const notes = [...state.notes];
      const [selectedNote] = notes.splice(index, 1);
      notes.push(selectedNote);

      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({
          ...state,
          notes,
        });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        notes,
        history,
        historyIndex,
      };
    });
  },

  setDrawPaths: (paths, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const drawPaths = [...paths];
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, drawPaths });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        drawPaths,
        history,
        historyIndex,
      };
    });
  },

  addDrawPath: (path, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const drawPaths = [...state.drawPaths, { ...path }];
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, drawPaths });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        drawPaths,
        history,
        historyIndex,
      };
    });
  },

  updateDrawPath: (id, patch, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const drawPaths = state.drawPaths.map((path) => (path.id === id ? { ...path, ...patch } : path));
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, drawPaths });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        drawPaths,
        history,
        historyIndex,
      };
    });
  },

  removeDrawPath: (id, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const drawPaths = state.drawPaths.filter((path) => path.id !== id);
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, drawPaths });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        drawPaths,
        history,
        historyIndex,
      };
    });
  },

  setGender: (gender) => {
    set((state) => {
      if (state.gender === gender) {
        return state;
      }
      return {
        ...state,
        gender,
      };
    });
  },

  setZoomLevel: (role, zoomLevel) => {
    set((state) => {
      if (role === 'patient') {
        if (state.patientZoomLevel === zoomLevel) {
          return state;
        }
        return { ...state, patientZoomLevel: zoomLevel };
      }
      if (state.therapistZoomLevel === zoomLevel) {
        return state;
      }
      return { ...state, therapistZoomLevel: zoomLevel };
    });
  },

  setTherapistNotes: (notes) => {
    set((state) => {
      if (state.therapistNotes === notes) {
        return state;
      }
      return {
        ...state,
        therapistNotes: notes,
      };
    });
  },

  markApplyingRemote: (applying) => {
    set((state) => {
      if (state.isApplyingRemote === applying) {
        return state;
      }
      return {
        ...state,
        isApplyingRemote: applying,
      };
    });
  },

  saveHistorySnapshot: () => {
    set((state) => {
      if (state.isApplyingRemote) {
        return state;
      }
      const snapshot = createSnapshot(state);
      const { history, historyIndex } = pushHistory(state, snapshot);
      return {
        ...state,
        history,
        historyIndex,
      };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex <= 0) {
        return state;
      }
      const newIndex = state.historyIndex - 1;
      const snapshot = state.history[newIndex];
      if (!snapshot) {
        return state;
      }
      return {
        ...state,
        historyIndex: newIndex,
        cards: snapshot.cards.map((card) => ({ ...card })),
        notes: snapshot.notes.map((note) => ({ ...note })),
        drawPaths: snapshot.drawPaths.map((path) => ({ ...path })),
        selectedCardId: null,
        selectedNoteId: null,
        selectedDrawPathId: null,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) {
        return state;
      }
      const newIndex = state.historyIndex + 1;
      const snapshot = state.history[newIndex];
      if (!snapshot) {
        return state;
      }
      return {
        ...state,
        historyIndex: newIndex,
        cards: snapshot.cards.map((card) => ({ ...card })),
        notes: snapshot.notes.map((note) => ({ ...note })),
        drawPaths: snapshot.drawPaths.map((path) => ({ ...path })),
        selectedCardId: null,
        selectedNoteId: null,
        selectedDrawPathId: null,
      };
    });
  },

  markDirty: (reason) => {
    set((state) => {
      if (state.pendingSaveReasons.includes(reason)) {
        return state;
      }
      return {
        ...state,
        pendingSaveReasons: [...state.pendingSaveReasons, reason],
      };
    });
  },

  consumeDirtyReasons: () => {
    const reasons = get().pendingSaveReasons;
    if (reasons.length === 0) {
      return [];
    }
    set((state) => ({
      ...state,
      pendingSaveReasons: [],
    }));
    return reasons;
  },

  setLastPersistedVersion: (version, updatedAt) => {
    set((state) => {
      const nextUpdatedAt = updatedAt ?? state.lastUpdatedAt;
      if (state.lastSavedVersion === version && state.lastUpdatedAt === nextUpdatedAt) {
        return state;
      }
      return {
        ...state,
        lastSavedVersion: version,
        lastUpdatedAt: nextUpdatedAt,
      };
    });
  },
}));

export const canvasStoreSelectors = {
  cards: (state: CanvasStore) => state.cards,
  notes: (state: CanvasStore) => state.notes,
  drawPaths: (state: CanvasStore) => state.drawPaths,
  gender: (state: CanvasStore) => state.gender,
  displayScale: (state: CanvasStore) => state.displayScale,
  stagePosition: (state: CanvasStore) => state.stagePosition,
  selectedCardId: (state: CanvasStore) => state.selectedCardId,
  selectedNoteId: (state: CanvasStore) => state.selectedNoteId,
  zoomLevels: (state: CanvasStore) => ({
    patient: state.patientZoomLevel,
    therapist: state.therapistZoomLevel,
  }),
  pendingSaveReasons: (state: CanvasStore) => state.pendingSaveReasons,
  metadata: (state: CanvasStore) => ({
    sessionId: state.sessionId,
    userRole: state.userRole,
    clientId: state.clientId,
    lastSavedVersion: state.lastSavedVersion,
    lastUpdatedAt: state.lastUpdatedAt,
  }),
};

export const canvasStore = {
  getState: useCanvasStore.getState,
  setState: useCanvasStore.setState,
  subscribe: useCanvasStore.subscribe,
};

