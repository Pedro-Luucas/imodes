/**
 * Worker endpoint for processing canvas autosave messages from PGMQ
 * This endpoint should be called periodically (via cron job or scheduled task)
 * to process queued canvas autosave operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { readMessages, archiveMessage } from '@/lib/pgmq';
import type { CanvasAutosaveMessage } from '@/types/pgmq';

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
 * POST /api/workers/canvas
 * Process messages from canvas-autosave queue
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

    console.log('[PGMQ Worker] 🔍 Lendo mensagens da fila canvas-autosave...', {
      maxMessages,
      visibilityTimeout,
      timestamp: new Date().toISOString(),
    });

    // Read messages from queue
    const messages = await readMessages<CanvasAutosaveMessage>({
      queue_name: 'canvas-autosave',
      vt: visibilityTimeout,
      qty: maxMessages,
    });

    console.log('[PGMQ Worker] 📨 Mensagens lidas da fila:', {
      count: messages.length,
      msgIds: messages.map(m => m.msg_id),
    });

    if (messages.length === 0) {
      console.log('[PGMQ Worker] ℹ️  Nenhuma mensagem na fila para processar');
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
        console.log('[PGMQ Worker] ⚙️  Processando mensagem:', {
          msg_id: msg.msg_id,
          read_ct: msg.read_ct,
          enqueued_at: msg.enqueued_at,
        });

        // Handle message - PGMQ stores messages as JSONB, but they might be returned as strings
        let messageData: CanvasAutosaveMessage;
        
        if (typeof msg.message === 'string') {
          try {
            messageData = JSON.parse(msg.message);
            console.log('[PGMQ Worker] 📝 Mensagem parseada (era string JSON)');
          } catch (parseError) {
            console.error('[PGMQ Worker] ❌ Erro ao fazer parse da mensagem:', parseError);
            throw new Error(`Failed to parse message JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          }
        } else {
          messageData = msg.message as CanvasAutosaveMessage;
          console.log('[PGMQ Worker] 📝 Mensagem já parseada (objeto)');
        }

        const { sessionId, canvasState, reasons } = messageData;

        console.log('[PGMQ Worker] 📋 Dados extraídos da mensagem:', {
          sessionId,
          hasCanvasState: !!canvasState,
          reasons,
          userId: messageData.userId,
        });

        if (!sessionId || sessionId === 'undefined') {
          console.error('[PGMQ Worker] ❌ sessionId inválido:', {
            msg_id: msg.msg_id,
            sessionId,
            message: messageData,
          });
          throw new Error(`Missing or invalid sessionId in message. Message: ${JSON.stringify(messageData)}`);
        }

        if (!canvasState) {
          console.error('[PGMQ Worker] ❌ canvasState ausente:', {
            msg_id: msg.msg_id,
            message: messageData,
          });
          throw new Error(`Missing canvasState in message. Message: ${JSON.stringify(messageData)}`);
        }

        console.log('[PGMQ Worker] 💾 Atualizando sessão no banco de dados:', {
          sessionId,
          canvasStateKeys: Object.keys(canvasState),
        });

        // Update session in database
        const { error: updateError } = await supabase
          .from('imodes_session')
          .update({
            data: canvasState,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        if (updateError) {
          console.error('[PGMQ Worker] ❌ Erro ao atualizar sessão:', {
            sessionId,
            error: updateError.message,
            code: updateError.code,
          });
          throw new Error(`Failed to update session: ${updateError.message}`);
        }

        console.log('[PGMQ Worker] ✅ Sessão atualizada com sucesso:', {
          sessionId,
          msg_id: msg.msg_id,
        });

        // Archive message after successful processing
        await archiveMessage('canvas-autosave', msg.msg_id);
        
        console.log('[PGMQ Worker] 🗄️  Mensagem arquivada:', {
          msg_id: msg.msg_id,
          sessionId,
        });

        results.push({
          msg_id: msg.msg_id,
          status: 'success',
        });
        processed++;
      } catch (error) {
        console.error(`Error processing canvas autosave message ${msg.msg_id}:`, error);
        
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

    console.log('[PGMQ Worker] 📊 Processamento concluído:', {
      processed,
      failed,
      total: messages.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      processed,
      failed,
      messages: results,
    });
  } catch (error) {
    console.error('Error in canvas worker:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workers/canvas
 * Health check endpoint
 */
export async function GET(): Promise<NextResponse<{ status: string; queue: string }>> {
  return NextResponse.json({
    status: 'ok',
    queue: 'canvas-autosave',
  });
}
