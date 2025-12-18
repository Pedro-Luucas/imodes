import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { hasRole } from '@/lib/roleAuth';
import { deleteFile } from '@/lib/s3Client';

type RouteContext = {
  params: Promise<{ sessionId: string; checkpointId: string }>;
};

type ErrorResponse = {
  error: string;
};

type DeleteResponse = {
  success: boolean;
};

const BUCKET_NAME = 'session_screenshots';

/**
 * DELETE /api/sessions/[sessionId]/checkpoints/[checkpointId]
 * 
 * Delete a checkpoint and its screenshot
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<DeleteResponse | ErrorResponse>> {
  try {
    const { sessionId, checkpointId } = await context.params;

    // Check authorization
    const { authorized, profile } = await hasRole(['therapist', 'patient', 'admin']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Verify session exists and user has access
    const { data: session, error: sessionError } = await supabase
      .from('imodes_session')
      .select('id, patient_id, therapist_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify access permissions
    const sessionPatientId = String(session.patient_id || '');
    const sessionTherapistId = String(session.therapist_id || '');
    const profileId = String(profile.id || '');

    if (profile.role === 'patient' && sessionPatientId !== profileId) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only delete checkpoints from your own sessions' },
        { status: 403 }
      );
    }

    if (profile.role === 'therapist' && sessionTherapistId !== profileId) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only delete checkpoints from sessions where you are the therapist' },
        { status: 403 }
      );
    }

    // Fetch checkpoint to get screenshot URL
    const { data: checkpoint, error: fetchError } = await supabase
      .from('session_checkpoints')
      .select('id, screenshot_url')
      .eq('id', checkpointId)
      .eq('session_id', sessionId)
      .single();

    if (fetchError || !checkpoint) {
      return NextResponse.json(
        { error: 'Checkpoint not found' },
        { status: 404 }
      );
    }

    // Delete screenshot from storage if exists
    if (checkpoint.screenshot_url) {
      try {
        // Extract file key from URL
        // URL format: {supabaseUrl}/storage/v1/object/public/{bucket}/{sessionId}/{checkpointId}.png
        const urlParts = checkpoint.screenshot_url.split(`${BUCKET_NAME}/`);
        if (urlParts.length > 1) {
          const fileKey = urlParts[1];
          await deleteFile(BUCKET_NAME, fileKey);
        }
      } catch (deleteError) {
        console.error('Error deleting screenshot file:', deleteError);
        // Continue with checkpoint deletion even if file deletion fails
      }
    }

    // Delete checkpoint record
    const { error: deleteError } = await supabase
      .from('session_checkpoints')
      .delete()
      .eq('id', checkpointId)
      .eq('session_id', sessionId);

    if (deleteError) {
      console.error('Error deleting checkpoint:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete checkpoint' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/sessions/[sessionId]/checkpoints/[checkpointId]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
