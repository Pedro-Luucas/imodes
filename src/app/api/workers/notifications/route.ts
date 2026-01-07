/**
 * Worker endpoint for processing notification messages from PGMQ
 * This endpoint should be called periodically (via cron job or scheduled task)
 * to process queued notification creation operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { readMessages, archiveMessage } from '@/lib/pgmq';
import { broadcastNotification } from '@/lib/notificationBroadcast';
import type { NotificationMessage } from '@/types/pgmq';

type ErrorResponse = {
  error: string;
};

type WorkerResponse = {
  processed: number;
  failed: number;
  messages: Array<{
    msg_id: number;
    status: 'success' | 'error';
    error?: string;
  }>;
};

/**
 * POST /api/workers/notifications
 * Process messages from notifications queue
 * 
 * Query parameters:
 * - maxMessages: Maximum number of messages to process (default: 10)
 * - visibilityTimeout: Visibility timeout in seconds (default: 60)
 */
export async function POST(request: NextRequest): Promise<NextResponse<WorkerResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const maxMessages = parseInt(searchParams.get('maxMessages') || '10', 10);
    const visibilityTimeout = parseInt(searchParams.get('visibilityTimeout') || '60', 10);

    // Read messages from queue
    const messages = await readMessages<NotificationMessage>({
      queue_name: 'notifications',
      vt: visibilityTimeout,
      qty: maxMessages,
    });

    if (messages.length === 0) {
      return NextResponse.json({
        processed: 0,
        failed: 0,
        messages: [],
      });
    }

    const supabase = createSupabaseServerClient();
    const results: WorkerResponse['messages'] = [];
    let processed = 0;
    let failed = 0;

    // Process each message
    for (const msg of messages) {
      try {
        const { user_id, type, title, message, data, link } = msg.message;

        // Create notification in database
        const { data: notification, error: insertError } = await supabase
          .from('notifications')
          .insert({
            user_id,
            type,
            title,
            message,
            data: data || {},
            link: link || null,
          })
          .select()
          .single();

        if (insertError || !notification) {
          throw new Error(`Failed to create notification: ${insertError?.message || 'Unknown error'}`);
        }

        // Broadcast the notification to the user's channel
        try {
          await broadcastNotification(
            supabase,
            user_id,
            'notification.created',
            notification
          );
        } catch (broadcastError) {
          // Log but don't fail - the notification was still created
          console.error('Error broadcasting notification:', broadcastError);
        }

        // Archive message after successful processing
        await archiveMessage('notifications', msg.msg_id);

        results.push({
          msg_id: msg.msg_id,
          status: 'success',
        });
        processed++;
      } catch (error) {
        console.error(`Error processing notification message ${msg.msg_id}:`, error);
        
        // Don't archive failed messages - they will become visible again after visibility timeout
        // This allows for automatic retry
        results.push({
          msg_id: msg.msg_id,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
        failed++;
      }
    }

    return NextResponse.json({
      processed,
      failed,
      messages: results,
    });
  } catch (error) {
    console.error('Error in notifications worker:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workers/notifications
 * Health check endpoint
 */
export async function GET(): Promise<NextResponse<{ status: string; queue: string }>> {
  return NextResponse.json({
    status: 'ok',
    queue: 'notifications',
  });
}
