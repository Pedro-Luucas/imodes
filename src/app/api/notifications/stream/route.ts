import { NextRequest } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabaseServerClient';
import { getUserFromCookie } from '@/lib/auth';

/**
 * GET /api/notifications/stream
 * Server-Sent Events endpoint for realtime notifications
 * Keeps Supabase credentials on the server
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

        // Subscribe to notifications for this user
        const channel = supabase
          .channel(`notifications:${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log('Notification event:', payload);
              send({
                type: 'notification',
                event: payload.eventType,
                payload: payload,
              });
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('Subscribed to notifications channel');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Channel error occurred');
              send({ type: 'error', message: 'Channel subscription failed' });
            }
          });

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
