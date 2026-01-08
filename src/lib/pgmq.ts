/**
 * PGMQ (Postgres Message Queue) client
 * Provides helper functions to interact with PGMQ queues via Supabase PostgREST
 * 
 * Note: PGMQ functions must be exposed via PostgREST in the pgmq_public schema
 * for these RPC calls to work. See migration file for setup instructions.
 */

import { createSupabaseServerClient } from './supabaseServerClient';
import type {
  CanvasAutosaveMessage,
  NotificationMessage,
  CheckpointMessage,
  PGMQMessage,
  PGMQReadOptions,
} from '@/types/pgmq';

/**
 * Send a message to a queue
 * Uses RPC to call pgmq.send function exposed via PostgREST
 */
export async function sendMessage<T = unknown>(
  queueName: string,
  message: T,
  delay?: number
): Promise<number> {
  const supabase = createSupabaseServerClient();
  
  // PGMQ expects JSONB, so we need to ensure the message is a JSON string
  const msgJson = typeof message === 'string' ? message : JSON.stringify(message);
  
  const params: {
    queue_name: string;
    msg: string;
  } = {
    queue_name: queueName,
    msg: msgJson,
  };

  // Add delay if provided
  const rpcParams: Record<string, unknown> = {
    ...params,
    ...(delay !== undefined && delay > 0 ? { delay } : {}),
  };

  console.log('[PGMQ Client] 📤 Enviando mensagem para fila:', {
    queue: queueName,
    messageSize: msgJson.length,
    hasDelay: delay !== undefined && delay > 0,
  });

  // Try calling via RPC (function must be exposed in public schema as pgmq_send)
  const { data, error } = await supabase.rpc('pgmq_send', rpcParams);

  if (error) {
    console.error('[PGMQ Client] ❌ Erro ao enviar mensagem:', {
      queue: queueName,
      error: error.message,
      code: error.code,
    });
    throw new Error(`Failed to send message to queue: ${error.message}`);
  }

  // PGMQ send returns a single number (message ID)
  if (typeof data === 'number') {
    console.log('[PGMQ Client] ✅ Mensagem enviada com sucesso:', {
      queue: queueName,
      msgId: data,
    });
    return data;
  }

  // Handle array response (shouldn't happen for send, but just in case)
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (typeof first === 'number') {
      return first;
    }
    if (typeof first === 'object' && 'send' in first) {
      return first.send as number;
    }
  }

  // Handle object response with 'send' property
  if (typeof data === 'object' && data !== null && 'send' in data) {
    return (data as { send: number }).send;
  }

  throw new Error(`Unexpected response format from pgmq.send: ${JSON.stringify(data)}`);
}

/**
 * Send multiple messages to a queue in batch
 */
export async function sendBatch<T = unknown>(
  queueName: string,
  messages: T[]
): Promise<number[]> {
  const supabase = createSupabaseServerClient();

  const msgs = messages.map((msg) => 
    typeof msg === 'string' ? msg : JSON.stringify(msg)
  );

  const { data, error } = await supabase.rpc('pgmq_send_batch', {
    queue_name: queueName,
    msgs,
  });

  if (error) {
    console.error(`Error sending batch to queue ${queueName}:`, error);
    throw new Error(`Failed to send batch to queue: ${error.message}`);
  }

  // PGMQ send_batch returns an array of message IDs
  if (Array.isArray(data)) {
    return data.map((id) => {
      if (typeof id === 'number') return id;
      if (typeof id === 'object' && id !== null && 'send_batch' in id) {
        return (id as { send_batch: number }).send_batch;
      }
      return parseInt(String(id), 10);
    });
  }

  throw new Error('Unexpected response format from pgmq.send_batch');
}

/**
 * Read messages from a queue
 */
export async function readMessages<T = unknown>(
  options: PGMQReadOptions
): Promise<PGMQMessage<T>[]> {
  const supabase = createSupabaseServerClient();

  console.log('[PGMQ Client] 📖 Lendo mensagens da fila:', {
    queue: options.queue_name,
    vt: options.vt ?? 30,
    qty: options.qty ?? 1,
  });

  const { data, error } = await supabase.rpc('pgmq_read', {
    queue_name: options.queue_name,
    vt_timeout: options.vt ?? 30, // default 30 seconds visibility timeout
    qty: options.qty ?? 1, // default read 1 message
  });

  if (error) {
    console.error('[PGMQ Client] ❌ Erro ao ler mensagens:', {
      queue: options.queue_name,
      error: error.message,
      code: error.code,
    });
    throw new Error(`Failed to read messages from queue: ${error.message}`);
  }

  const messageCount = Array.isArray(data) ? data.length : (data ? 1 : 0);
  console.log('[PGMQ Client] ✅ Mensagens lidas:', {
    queue: options.queue_name,
    count: messageCount,
  });

  if (!data) {
    return [];
  }

  // PGMQ read returns an array of messages (or empty array)
  if (Array.isArray(data)) {
    return data as PGMQMessage<T>[];
  }

  // If single message, wrap in array
  return [data as PGMQMessage<T>];
}

/**
 * Pop a message from a queue (read and delete immediately)
 */
export async function popMessage<T = unknown>(
  queueName: string
): Promise<PGMQMessage<T> | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc('pgmq_pop', {
    queue_name: queueName,
  });

  if (error) {
    console.error(`Error popping message from queue ${queueName}:`, error);
    throw new Error(`Failed to pop message from queue: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // If it's an array, return the first message (shouldn't happen for pop)
  if (Array.isArray(data)) {
    return data.length > 0 ? (data[0] as PGMQMessage<T>) : null;
  }

  return data as PGMQMessage<T>;
}

/**
 * Archive a message (move to archive table)
 */
export async function archiveMessage(
  queueName: string,
  msgId: number
): Promise<boolean> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc('pgmq_archive', {
    queue_name: queueName,
    msg_id: msgId,
  });

  if (error) {
    console.error(`Error archiving message ${msgId} from queue ${queueName}:`, error);
    throw new Error(`Failed to archive message: ${error.message}`);
  }

  // PGMQ archive returns true on success, or array of IDs for batch
  if (data === true || data === 't') {
    return true;
  }

  // If array, check if our msgId is in it
  if (Array.isArray(data) && data.length > 0) {
    return true;
  }

  return false;
}

/**
 * Archive multiple messages
 */
export async function archiveMessages(
  queueName: string,
  msgIds: number[]
): Promise<number[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc('pgmq_archive_batch', {
    queue_name: queueName,
    msg_ids: msgIds,
  });

  if (error) {
    console.error(`Error archiving messages from queue ${queueName}:`, error);
    throw new Error(`Failed to archive messages: ${error.message}`);
  }

  // PGMQ archive with msg_ids returns array of archived message IDs
  if (Array.isArray(data)) {
    return data.map((id) => {
      if (typeof id === 'number') return id;
      return parseInt(String(id), 10);
    });
  }

  return [];
}

/**
 * Delete a message from a queue
 */
export async function deleteMessage(
  queueName: string,
  msgId: number
): Promise<boolean> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc('pgmq_delete', {
    queue_name: queueName,
    msg_id: msgId,
  });

  if (error) {
    console.error(`Error deleting message ${msgId} from queue ${queueName}:`, error);
    throw new Error(`Failed to delete message: ${error.message}`);
  }

  // PGMQ delete returns true on success
  return data === true || data === 't';
}

/**
 * Type-safe helpers for specific queues
 */

export async function sendCanvasAutosaveMessage(
  message: Omit<CanvasAutosaveMessage, 'timestamp'>
): Promise<number> {
  return sendMessage<CanvasAutosaveMessage>('canvas-autosave', {
    ...message,
    timestamp: new Date().toISOString(),
  });
}

export async function sendNotificationMessage(
  message: Omit<NotificationMessage, 'timestamp'>
): Promise<number> {
  return sendMessage<NotificationMessage>('notifications', {
    ...message,
    timestamp: new Date().toISOString(),
  });
}

export async function sendCheckpointMessage(
  message: Omit<CheckpointMessage, 'timestamp'>
): Promise<number> {
  return sendMessage<CheckpointMessage>('canvas-checkpoints', {
    ...message,
    timestamp: new Date().toISOString(),
  });
}
