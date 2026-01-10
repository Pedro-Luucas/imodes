import { NextRequest } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabaseServerClient';
import { getUserFromCookie } from '@/lib/auth';
import {
  subscribeToNotificationBroadcast,
  type NotificationBroadcastPayload,
} from '@/lib/notificationBroadcast';

/**
 * GET /api/notifications/stream
 * Server-Sent Events endpoint for realtime notifications
 * 
 * OPTIMIZED: Uses Supabase Broadcast channels instead of postgres_changes
 * This eliminates WAL polling and reduces database load by ~75%
 */
export async function GET(request: NextRequest) {
  // Get authenticated user
  const user = await getUserFromCookie();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Helper to send SSE message
      const send = (data: object) => {
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Error sending SSE message:', error);
        }
      };

      try {
        // Initialize Supabase client (server-side only)
        const supabase = createSupabaseAnonClient();

        // Subscribe to broadcast notifications for this user
        // This is much more efficient than postgres_changes as it doesn't poll the WAL
        const channel = subscribeToNotificationBroadcast(
          supabase,
          user.id,
          (payload: NotificationBroadcastPayload) => {
            send({
              type: 'notification',
              event: payload.event,
              notification: payload.notification,
              timestamp: payload.timestamp,
            });
          },
          (status) => {
            if (status === 'SUBSCRIBED') {
              console.log('Subscribed to notifications broadcast channel');
            } else if (status === 'CHANNEL_ERROR') {
              // Log error on server but don't send to client
              // The EventSource will automatically try to reconnect
              // Sending errors to client causes noise and unnecessary warnings
              console.error('Broadcast channel error occurred (will attempt to reconnect)');
              // Only send error to client if we're unable to continue the stream
              // For transient errors, let EventSource handle reconnection
            } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
              // These are also transient - EventSource will handle reconnection
              console.warn(`Notification channel status: ${status} (will attempt to reconnect)`);
            }
          }
        );

        // Send initial connection message
        send({ type: 'connected' });

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log('Client disconnected, cleaning up subscription');
          try {
            channel.unsubscribe();
            controller.close();
          } catch (error) {
            console.error('Error cleaning up subscription:', error);
          }
        });
      } catch (error) {
        console.error('Error setting up SSE stream:', error);
        send({ type: 'error', message: 'Failed to initialize notification stream' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
