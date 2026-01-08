/**
 * Worker endpoint for processing checkpoint messages from PGMQ
 * This endpoint should be called periodically (via cron job or scheduled task)
 * to process queued checkpoint creation operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { readMessages, archiveMessage } from '@/lib/pgmq';
import { uploadFile } from '@/lib/s3Client';
import type { CheckpointMessage } from '@/types/pgmq';

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

const BUCKET_NAME = 'session_screenshots';
const MAX_CHECKPOINTS_PER_SESSION = 50;

/**
 * POST /api/workers/checkpoints
 * Process messages from canvas-checkpoints queue
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
    const messages = await readMessages<CheckpointMessage>({
      queue_name: 'canvas-checkpoints',
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
        const { sessionId, checkpointData, screenshot, userId } = msg.message;

        // Verify session exists
        const { data: session, error: sessionError } = await supabase
          .from('imodes_session')
          .select('id')
          .eq('id', sessionId)
          .single();

        if (sessionError || !session) {
          throw new Error(`Session not found: ${sessionId}`);
        }

        // Check checkpoint limit
        const { count, error: countError } = await supabase
          .from('session_checkpoints')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId);

        if (countError) {
          throw new Error(`Failed to check checkpoint limit: ${countError.message}`);
        }

        if (count !== null && count >= MAX_CHECKPOINTS_PER_SESSION) {
          throw new Error(`Maximum of ${MAX_CHECKPOINTS_PER_SESSION} checkpoints per session reached`);
        }

        // Create checkpoint record
        const { data: checkpoint, error: insertError } = await supabase
          .from('session_checkpoints')
          .insert({
            session_id: sessionId,
            name: checkpointData.name,
            state: checkpointData.state,
            created_by: userId,
          })
          .select()
          .single();

        if (insertError || !checkpoint) {
          throw new Error(`Failed to create checkpoint: ${insertError?.message || 'Unknown error'}`);
        }

        // Upload screenshot if provided
        let screenshotUrl: string | null = null;
        if (screenshot && screenshot.data) {
          try {
            // Convert base64 back to buffer
            const fileBuffer = Buffer.from(screenshot.data, 'base64');
            const extension = screenshot.type === 'image/png' ? 'png' : 
                             screenshot.type === 'image/jpeg' ? 'jpg' : 'png';
            const fullKey = `${sessionId}/${checkpoint.id}.${extension}`;

            await uploadFile(BUCKET_NAME, fullKey, fileBuffer, screenshot.type);

            const supabaseUrl = process.env.SUPABASE_URL;
            screenshotUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${fullKey}`;

            // Update checkpoint with screenshot URL
            const { error: updateError } = await supabase
              .from('session_checkpoints')
              .update({ screenshot_url: screenshotUrl })
              .eq('id', checkpoint.id);

            if (updateError) {
              console.error('Error updating checkpoint with screenshot URL:', updateError);
              // Don't fail the whole operation if screenshot update fails
            }
          } catch (uploadError) {
            console.error('Error uploading screenshot:', uploadError);
            // Continue without screenshot - checkpoint is still valid
          }
        }

        // Archive message after successful processing
        await archiveMessage('canvas-checkpoints', msg.msg_id);

        results.push({
          msg_id: msg.msg_id,
          status: 'success',
        });
        processed++;
      } catch (error) {
        console.error(`Error processing checkpoint message ${msg.msg_id}:`, error);
        
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
    console.error('Error in checkpoints worker:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workers/checkpoints
 * Health check endpoint
 */
export async function GET(): Promise<NextResponse<{ status: string; queue: string }>> {
  return NextResponse.json({
    status: 'ok',
    queue: 'canvas-checkpoints',
  });
}
