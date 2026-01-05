/**
 * Notification broadcast utility
 * Uses Supabase Broadcast channels instead of postgres_changes
 * This eliminates WAL polling and significantly reduces database load
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Notification } from '@/types/notifications';

/**
 * Channel name for user-specific notifications
 */
export const getNotificationChannelName = (userId: string) => 
  `notifications-broadcast:${userId}`;

/**
 * Broadcast event types
 */
export type NotificationBroadcastEvent = 
  | 'notification.created'
  | 'notification.updated'
  | 'notification.deleted';

/**
 * Broadcast payload structure
 */
export interface NotificationBroadcastPayload {
  event: NotificationBroadcastEvent;
  notification: Notification;
  timestamp: string;
}

/**
 * Broadcast a notification event to a specific user
 * Call this after creating/updating/deleting a notification
 */
export async function broadcastNotification(
  supabase: SupabaseClient,
  userId: string,
  event: NotificationBroadcastEvent,
  notification: Notification
): Promise<void> {
  const channelName = getNotificationChannelName(userId);
  
  const channel = supabase.channel(channelName);
  
  try {
    // Subscribe briefly to send the message
    await channel.subscribe();
    
    await channel.send({
      type: 'broadcast',
      event: 'notification',
      payload: {
        event,
        notification,
        timestamp: new Date().toISOString(),
      } as NotificationBroadcastPayload,
    });
  } finally {
    // Clean up the channel after sending
    await channel.unsubscribe();
  }
}

/**
 * Subscribe to notification broadcasts for a user
 * Returns the channel for cleanup
 */
export function subscribeToNotificationBroadcast(
  supabase: SupabaseClient,
  userId: string,
  onNotification: (payload: NotificationBroadcastPayload) => void,
  onStatusChange?: (status: string) => void
) {
  const channelName = getNotificationChannelName(userId);
  
  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'notification' }, ({ payload }) => {
      onNotification(payload as NotificationBroadcastPayload);
    })
    .subscribe((status) => {
      onStatusChange?.(status);
    });

  return channel;
}

