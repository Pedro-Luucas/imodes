/**
 * Test endpoint for PGMQ integration
 * This endpoint helps verify that PGMQ is configured correctly
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, readMessages, archiveMessage } from '@/lib/pgmq';

type ErrorResponse = {
  error: string;
};

type TestResponse = {
  status: string;
  tests: Array<{
    name: string;
    status: 'pass' | 'fail';
    message: string;
    data?: unknown;
  }>;
};

/**
 * POST /api/workers/test
 * Test PGMQ functionality
 * 
 * Query parameters:
 * - queue: Queue name to test (default: 'canvas-autosave')
 */
export async function POST(request: NextRequest): Promise<NextResponse<TestResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const queueName = searchParams.get('queue') || 'canvas-autosave';

    const tests: TestResponse['tests'] = [];
    let allPassed = true;

    // Test 1: Send a message
    try {
      const testMessage = {
        test: true,
        timestamp: new Date().toISOString(),
        queue: queueName,
      };

      const msgId = await sendMessage(queueName, testMessage);
      
      tests.push({
        name: 'Send Message',
        status: 'pass',
        message: `Successfully sent message to queue ${queueName}`,
        data: { msg_id: msgId },
      });

      // Test 2: Read the message
      try {
        const messages = await readMessages({
          queue_name: queueName,
          vt: 30,
          qty: 1,
        });

        if (messages.length > 0 && messages[0].msg_id === msgId) {
          const readMsg = messages[0];
          
          tests.push({
            name: 'Read Message',
            status: 'pass',
            message: `Successfully read message from queue ${queueName}`,
            data: {
              msg_id: readMsg.msg_id,
              message: readMsg.message,
            },
          });

          // Test 3: Archive the message
          try {
            await archiveMessage(queueName, msgId);
            
            tests.push({
              name: 'Archive Message',
              status: 'pass',
              message: `Successfully archived message ${msgId}`,
              data: { msg_id: msgId },
            });
          } catch (archiveError) {
            allPassed = false;
            tests.push({
              name: 'Archive Message',
              status: 'fail',
              message: `Failed to archive message: ${archiveError instanceof Error ? archiveError.message : String(archiveError)}`,
            });
          }
        } else {
          allPassed = false;
          tests.push({
            name: 'Read Message',
            status: 'fail',
            message: `Message read but ID mismatch. Expected ${msgId}, got ${messages[0]?.msg_id || 'none'}`,
          });
        }
      } catch (readError) {
        allPassed = false;
        tests.push({
          name: 'Read Message',
          status: 'fail',
          message: `Failed to read message: ${readError instanceof Error ? readError.message : String(readError)}`,
        });
      }
    } catch (sendError) {
      allPassed = false;
      tests.push({
        name: 'Send Message',
        status: 'fail',
        message: `Failed to send message: ${sendError instanceof Error ? sendError.message : String(sendError)}`,
      });
    }

    return NextResponse.json({
      status: allPassed ? 'ok' : 'partial',
      tests,
    });
  } catch (error) {
    console.error('Error in PGMQ test:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workers/test
 * Get test status and instructions
 */
export async function GET(): Promise<NextResponse<{
  instructions: string[];
  availableQueues: string[];
  testEndpoints: string[];
}>> {
  return NextResponse.json({
    instructions: [
      '1. Make sure PGMQ extension is installed in Supabase',
      '2. Make sure queues are created (run migration)',
      '3. Expose PGMQ functions via PostgREST (pgmq_public schema)',
      '4. Call POST /api/workers/test?queue=canvas-autosave to test',
      '5. Call POST /api/workers/test?queue=notifications to test notifications queue',
      '6. Call POST /api/workers/test?queue=canvas-checkpoints to test checkpoints queue',
    ],
    availableQueues: [
      'canvas-autosave',
      'notifications',
      'canvas-checkpoints',
    ],
    testEndpoints: [
      'POST /api/workers/test?queue=canvas-autosave',
      'POST /api/workers/test?queue=notifications',
      'POST /api/workers/test?queue=canvas-checkpoints',
    ],
  });
}
