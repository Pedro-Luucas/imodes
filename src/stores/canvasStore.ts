'use client';

import { create } from 'zustand';
import type { CanvasCard, CanvasState, Gender, TextElement, PostItElement, DrawPath } from '@/types/canvas';

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
  textElements: TextElement[];
  postItElements: PostItElement[];
  drawPaths: DrawPath[];
}

interface CanvasStoreState {
  sessionId: string | null;
  userRole: 'therapist' | 'patient' | null;
  clientId: string;

  cards: CanvasCard[];
  textElements: TextElement[];
  postItElements: PostItElement[];
  drawPaths: DrawPath[];
  gender: Gender;

  patientZoomLevel: number;
  therapistZoomLevel: number;
  therapistNotes?: string;

  displayScale: number;
  stagePosition: { x: number; y: number };

  selectedCardId: string | null;
  selectedTextElementId: string | null;
  selectedPostItElementId: string | null;
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
  selectTextElement: (id: string | null) => void;
  selectPostItElement: (id: string | null) => void;
  selectDrawPath: (id: string | null) => void;

  addCard: (card: CanvasCard, options?: { skipHistory?: boolean }) => void;
  updateCard: (id: string, patch: Partial<CanvasCard>, options?: { skipHistory?: boolean }) => void;
  removeCard: (id: string, options?: { skipHistory?: boolean }) => void;
  clearCanvas: (options?: { skipHistory?: boolean }) => void;
  bringCardToFront: (id: string, options?: { skipHistory?: boolean }) => void;

  addTextElement: (element: TextElement, options?: { skipHistory?: boolean }) => void;
  updateTextElement: (id: string, patch: Partial<TextElement>, options?: { skipHistory?: boolean }) => void;
  removeTextElement: (id: string, options?: { skipHistory?: boolean }) => void;
  bringTextElementToFront: (id: string, options?: { skipHistory?: boolean }) => void;

  addPostItElement: (element: PostItElement, options?: { skipHistory?: boolean }) => void;
  updatePostItElement: (id: string, patch: Partial<PostItElement>, options?: { skipHistory?: boolean }) => void;
  removePostItElement: (id: string, options?: { skipHistory?: boolean }) => void;
  bringPostItElementToFront: (id: string, options?: { skipHistory?: boolean }) => void;

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
  textElements: [],
  postItElements: [],
  drawPaths: [],
  gender: 'male',
  patientZoomLevel: 60,
  therapistZoomLevel: 60,
  therapistNotes: undefined,
  displayScale: 0.6,
  stagePosition: { x: 0, y: 0 },
  selectedCardId: null,
  selectedTextElementId: null,
  selectedPostItElementId: null,
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
  textElements: state.textElements.map((el) => ({ ...el })),
  postItElements: state.postItElements.map((el) => ({ ...el })),
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
      const textElements = Array.isArray(state?.textElements) ? state.textElements.map((el) => ({ ...el })) : [];
      const postItElements = Array.isArray(state?.postItElements) ? state.postItElements.map((el) => ({ ...el })) : [];
      const gender = state?.gender ?? 'male';
      // Default zoom is 60% actual which displays as 100% (with +40 offset)
      const patientZoomLevel = state?.patientSettings?.zoomLevel ?? 60;
      const therapistZoomLevel = state?.therapistSettings?.zoomLevel ?? 60;
      const therapistNotes = state?.therapistSettings?.notes ?? current.therapistNotes;

      const snapshot = createSnapshot({
        ...current,
        cards,
        textElements,
        postItElements,
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
        textElements,
        postItElements,
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
      const textElements = Array.isArray(snapshotState.textElements)
        ? snapshotState.textElements.map((el) => ({ ...el }))
        : [];
      const postItElements = Array.isArray(snapshotState.postItElements)
        ? snapshotState.postItElements.map((el) => ({ ...el }))
        : [];
      const gender = snapshotState.gender ?? state.gender;
      const patientZoomLevel = snapshotState.patientSettings?.zoomLevel ?? state.patientZoomLevel;
      const therapistZoomLevel =
        snapshotState.therapistSettings?.zoomLevel ?? state.therapistZoomLevel;
      const therapistNotes = snapshotState.therapistSettings?.notes ?? state.therapistNotes;

      const snapshot = createSnapshot({
        ...state,
        cards,
        textElements,
        postItElements,
        drawPaths: Array.isArray(snapshotState.drawPaths) ? snapshotState.drawPaths.map((path) => ({ ...path })) : [],
        gender,
      });

      const replaceHistory = options?.replaceHistory ?? true;

      return {
        ...state,
        cards,
        textElements,
        postItElements,
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
      selectedTextElementId: id ? null : state.selectedTextElementId,
      selectedPostItElementId: id ? null : state.selectedPostItElementId,
      selectedDrawPathId: id ? null : state.selectedDrawPathId,
    }));
  },

  selectTextElement: (id) => {
    set((state) => ({
      ...state,
      selectedTextElementId: id,
      selectedCardId: id ? null : state.selectedCardId,
      selectedPostItElementId: id ? null : state.selectedPostItElementId,
      selectedDrawPathId: id ? null : state.selectedDrawPathId,
    }));
  },

  selectPostItElement: (id) => {
    set((state) => ({
      ...state,
      selectedPostItElementId: id,
      selectedCardId: id ? null : state.selectedCardId,
      selectedTextElementId: id ? null : state.selectedTextElementId,
      selectedDrawPathId: id ? null : state.selectedDrawPathId,
    }));
  },

  selectDrawPath: (id) => {
    set((state) => ({
      ...state,
      selectedDrawPathId: id,
      selectedCardId: id ? null : state.selectedCardId,
      selectedTextElementId: id ? null : state.selectedTextElementId,
      selectedPostItElementId: id ? null : state.selectedPostItElementId,
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
          textElements: [],
          postItElements: [],
          drawPaths: [],
        });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }
      return {
        ...state,
        cards: [],
        textElements: [],
        postItElements: [],
        drawPaths: [],
        selectedCardId: null,
        selectedTextElementId: null,
        selectedPostItElementId: null,
        selectedDrawPathId: null,
        history,
        historyIndex,
      };
    });
  },

  // Text Element Actions
  addTextElement: (element, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const textElements = [...state.textElements, { ...element }];
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, textElements });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        textElements,
        history,
        historyIndex,
      };
    });
  },

  updateTextElement: (id, patch, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const textElements = state.textElements.map((el) => (el.id === id ? { ...el, ...patch } : el));
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, textElements });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        textElements,
        history,
        historyIndex,
      };
    });
  },

  removeTextElement: (id, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const textElements = state.textElements.filter((el) => el.id !== id);
      let history = state.history;
      let historyIndex = state.historyIndex;
      const selectedTextElementId = state.selectedTextElementId === id ? null : state.selectedTextElementId;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, textElements });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        textElements,
        history,
        historyIndex,
        selectedTextElementId,
      };
    });
  },

  bringTextElementToFront: (id, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const index = state.textElements.findIndex((el) => el.id === id);
      if (index === -1) {
        return state;
      }

      const textElements = [...state.textElements];
      const [selectedElement] = textElements.splice(index, 1);
      textElements.push(selectedElement);

      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({
          ...state,
          textElements,
        });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        textElements,
        history,
        historyIndex,
      };
    });
  },

  // Post-It Element Actions
  addPostItElement: (element, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const postItElements = [...state.postItElements, { ...element }];
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, postItElements });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        postItElements,
        history,
        historyIndex,
      };
    });
  },

  updatePostItElement: (id, patch, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const postItElements = state.postItElements.map((el) => (el.id === id ? { ...el, ...patch } : el));
      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, postItElements });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        postItElements,
        history,
        historyIndex,
      };
    });
  },

  removePostItElement: (id, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const postItElements = state.postItElements.filter((el) => el.id !== id);
      let history = state.history;
      let historyIndex = state.historyIndex;
      const selectedPostItElementId = state.selectedPostItElementId === id ? null : state.selectedPostItElementId;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({ ...state, postItElements });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        postItElements,
        history,
        historyIndex,
        selectedPostItElementId,
      };
    });
  },

  bringPostItElementToFront: (id, options) => {
    const skipHistory = options?.skipHistory ?? false;
    set((state) => {
      const index = state.postItElements.findIndex((el) => el.id === id);
      if (index === -1) {
        return state;
      }

      const postItElements = [...state.postItElements];
      const [selectedElement] = postItElements.splice(index, 1);
      postItElements.push(selectedElement);

      let history = state.history;
      let historyIndex = state.historyIndex;

      if (!skipHistory && !state.isApplyingRemote) {
        const snapshot = createSnapshot({
          ...state,
          postItElements,
        });
        ({ history, historyIndex } = pushHistory(state, snapshot));
      }

      return {
        ...state,
        postItElements,
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
        textElements: snapshot.textElements.map((el) => ({ ...el })),
        postItElements: snapshot.postItElements.map((el) => ({ ...el })),
        drawPaths: snapshot.drawPaths.map((path) => ({ ...path })),
        selectedCardId: null,
        selectedTextElementId: null,
        selectedPostItElementId: null,
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
        textElements: snapshot.textElements.map((el) => ({ ...el })),
        postItElements: snapshot.postItElements.map((el) => ({ ...el })),
        drawPaths: snapshot.drawPaths.map((path) => ({ ...path })),
        selectedCardId: null,
        selectedTextElementId: null,
        selectedPostItElementId: null,
        selectedDrawPathId: null,
      };
    });
  },

  markDirty: (reason) => {
    set((state) => {
      if (state.pendingSaveReasons.includes(reason)) {
        return state;
      }
      const newReasons = [...state.pendingSaveReasons, reason];
      console.log('[Canvas Store] 🏷️ Marcando como dirty:', {
        reason,
        allReasons: newReasons,
        sessionId: state.sessionId,
        cardsCount: state.cards.length,
        textElementsCount: state.textElements.length,
        postItElementsCount: state.postItElements.length,
        drawPathsCount: state.drawPaths.length,
      });
      return {
        ...state,
        pendingSaveReasons: newReasons,
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
  textElements: (state: CanvasStore) => state.textElements,
  postItElements: (state: CanvasStore) => state.postItElements,
  drawPaths: (state: CanvasStore) => state.drawPaths,
  gender: (state: CanvasStore) => state.gender,
  displayScale: (state: CanvasStore) => state.displayScale,
  stagePosition: (state: CanvasStore) => state.stagePosition,
  selectedCardId: (state: CanvasStore) => state.selectedCardId,
  selectedTextElementId: (state: CanvasStore) => state.selectedTextElementId,
  selectedPostItElementId: (state: CanvasStore) => state.selectedPostItElementId,
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

if (typeof window !== 'undefined') {
  (window as unknown as { canvasStore: unknown }).canvasStore = canvasStore;
}
