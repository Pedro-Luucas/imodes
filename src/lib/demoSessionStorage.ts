/**
 * Demo Session Storage
 * 
 * Handles localStorage persistence for demo sessions (sessions that start with "demo-")
 * These sessions are NOT persisted in the database, only in browser localStorage
 */

import type { CanvasState } from '@/types/canvas';

const DEMO_SESSION_PREFIX = 'demo-';
const STORAGE_KEY_PREFIX = 'imodes-demo-session-';

export function isDemoSession(sessionId: string | null): boolean {
  return sessionId !== null && sessionId.startsWith(DEMO_SESSION_PREFIX);
}

export function getDemoSessionKey(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

export function saveDemoSession(sessionId: string, state: CanvasState): void {
  if (!isDemoSession(sessionId)) {
    return;
  }

  try {
    const key = getDemoSessionKey(sessionId);
    const data = {
      state,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving demo session to localStorage:', error);
  }
}

export function loadDemoSession(sessionId: string): CanvasState | null {
  if (!isDemoSession(sessionId)) {
    return null;
  }

  try {
    const key = getDemoSessionKey(sessionId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return null;
    }

    const data = JSON.parse(stored);
    return data.state || null;
  } catch (error) {
    console.error('Error loading demo session from localStorage:', error);
    return null;
  }
}

export function getInitialDemoState(): CanvasState {
  return {
    cards: [],
    notes: [],
    drawPaths: [],
    gender: 'male',
    patientSettings: {
      zoomLevel: 60,
    },
    therapistSettings: {
      zoomLevel: 60,
    },
    version: 0,
    updatedAt: new Date().toISOString(),
  };
}
