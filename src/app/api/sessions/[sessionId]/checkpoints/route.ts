import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { hasRole } from '@/lib/roleAuth';
import { uploadFile } from '@/lib/s3Client';
import type { SessionCheckpoint, CanvasState } from '@/types/canvas';

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

type ErrorResponse = {
  error: string;
};

type CheckpointResponse = {
  checkpoint: SessionCheckpoint;
};

type CheckpointsListResponse = {
  checkpoints: SessionCheckpoint[];
};

const BUCKET_NAME = 'session_screenshots';
const MAX_CHECKPOINTS_PER_SESSION = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * GET /api/sessions/[sessionId]/checkpoints
 * 
 * List all checkpoints for a session
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<CheckpointsListResponse | ErrorResponse>> {
  try {
    const { sessionId } = await context.params;

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
        { error: 'Unauthorized - You can only view checkpoints of your own sessions' },
        { status: 403 }
      );
    }

    if (profile.role === 'therapist' && sessionTherapistId !== profileId) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only view checkpoints of sessions where you are the therapist' },
        { status: 403 }
      );
    }

    // Fetch checkpoints
    const { data: checkpoints, error: checkpointsError } = await supabase
      .from('session_checkpoints')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (checkpointsError) {
      console.error('Error fetching checkpoints:', checkpointsError);
      return NextResponse.json(
        { error: 'Failed to fetch checkpoints' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { checkpoints: checkpoints as SessionCheckpoint[] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sessions/[sessionId]/checkpoints:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[sessionId]/checkpoints
 * 
 * Create a new checkpoint with screenshot
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<CheckpointResponse | ErrorResponse>> {
  try {
    const { sessionId } = await context.params;

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
        { error: 'Unauthorized - You can only create checkpoints in your own sessions' },
        { status: 403 }
      );
    }

    if (profile.role === 'therapist' && sessionTherapistId !== profileId) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only create checkpoints in sessions where you are the therapist' },
        { status: 403 }
      );
    }

    // Check checkpoint limit
    const { count, error: countError } = await supabase
      .from('session_checkpoints')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (countError) {
      console.error('Error counting checkpoints:', countError);
      return NextResponse.json(
        { error: 'Failed to check checkpoint limit' },
        { status: 500 }
      );
    }

    if (count !== null && count >= MAX_CHECKPOINTS_PER_SESSION) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_CHECKPOINTS_PER_SESSION} checkpoints per session reached` },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const stateJson = formData.get('state') as string;
    const screenshot = formData.get('screenshot') as File | null;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Checkpoint name is required' },
        { status: 400 }
      );
    }

    if (!stateJson) {
      return NextResponse.json(
        { error: 'Canvas state is required' },
        { status: 400 }
      );
    }

    let state: CanvasState;
    try {
      state = JSON.parse(stateJson);
    } catch {
      return NextResponse.json(
        { error: 'Invalid canvas state format' },
        { status: 400 }
      );
    }

    // Validate screenshot if provided
    if (screenshot && screenshot.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Screenshot file size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Create checkpoint record first to get the ID
    const { data: checkpoint, error: insertError } = await supabase
      .from('session_checkpoints')
      .insert({
        session_id: sessionId,
        name: name.trim(),
        state: state,
        created_by: profile.id,
      })
      .select()
      .single();

    if (insertError || !checkpoint) {
      console.error('Error creating checkpoint:', insertError);
      return NextResponse.json(
        { error: 'Failed to create checkpoint' },
        { status: 500 }
      );
    }

    // Upload screenshot if provided
    let screenshotUrl: string | null = null;
    if (screenshot) {
      try {
        const arrayBuffer = await screenshot.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
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
        }
      } catch (uploadError) {
        console.error('Error uploading screenshot:', uploadError);
        // Continue without screenshot - checkpoint is still valid
      }
    }

    return NextResponse.json(
      { 
        checkpoint: {
          ...checkpoint,
          screenshot_url: screenshotUrl,
        } as SessionCheckpoint 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/sessions/[sessionId]/checkpoints:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


