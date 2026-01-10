/**
 * Type definitions for PGMQ message queues
 */

/**
 * Message payload for canvas autosave operations
 */
export interface CanvasAutosaveMessage {
  sessionId: string;
  canvasState: {
    cards?: unknown[];
    notes?: unknown[];
    gender?: string;
    patientZoomLevel?: number;
    therapistZoomLevel?: number;
    therapistNotes?: string;
    version: number;
    updatedAt: string;
    drawPaths?: unknown[];
  };
  reasons: string[];
  userId: string;
  timestamp: string;
}

/**
 * Message payload for notification creation
 */
export interface NotificationMessage {
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  link?: string | null;
  timestamp: string;
}

/**
 * Message payload for checkpoint creation
 */
export interface CheckpointMessage {
  sessionId: string;
  checkpointData: {
    name: string;
    state: {
      cards?: unknown[];
      textElements?: unknown[];
      postItElements?: unknown[];
      gender?: string;
      patientSettings?: {
        zoomLevel?: number;
      };
      therapistSettings?: {
        zoomLevel?: number;
        notes?: string;
      };
      version: number;
      updatedAt: string;
      drawPaths?: unknown[];
    };
  };
  screenshot?: {
    data: string; // Base64 encoded image data
    type: string; // MIME type (image/png, image/jpeg)
    size: number;
  } | null;
  userId: string;
  timestamp: string;
}

/**
 * PGMQ message structure
 */
export interface PGMQMessage<T = unknown> {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: T;
  headers?: Record<string, unknown> | null;
}

/**
 * PGMQ send result
 */
export interface PGMQSendResult {
  send: number; // message ID
}

/**
 * PGMQ read options
 */
export interface PGMQReadOptions {
  queue_name: string;
  vt?: number; // visibility timeout in seconds
  qty?: number; // number of messages to read
}

/**
 * PGMQ archive/delete result
 */
export interface PGMQArchiveResult {
  archive: number[]; // array of archived message IDs
}

export interface PGMQDeleteResult {
  delete: boolean;
}
