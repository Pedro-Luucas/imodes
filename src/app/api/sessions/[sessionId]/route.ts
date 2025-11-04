import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { hasRole } from '@/lib/roleAuth';
import type { CanvasSession } from '@/types/canvas';

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

type ErrorResponse = {
  error: string;
};

type GetSessionResponse = {
  session: CanvasSession;
};

type UpdateSessionResponse = {
  session: CanvasSession;
};

/**
 * GET /api/sessions/[sessionId]
 * 
 * Get a single session
 * Verify access: patient owns it OR therapist has access to patient
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<GetSessionResponse | ErrorResponse>> {
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

    // Get session
    const { data: session, error } = await supabase
      .from('imodes_session')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify access permissions
    if (profile.role === 'patient') {
      // Patients can only access their own sessions
      if (session.patient_id !== profile.id) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only access your own sessions' },
          { status: 403 }
        );
      }
    } else if (profile.role === 'therapist') {
      // Therapists can access sessions where they are the therapist
      if (session.therapist_id !== profile.id) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only access sessions where you are the therapist' },
          { status: 403 }
        );
      }

      // Verify therapist has access to the patient
      const { data: patientAssignment } = await supabase
        .from('patients')
        .select('id')
        .eq('id', session.patient_id)
        .eq('therapist_id', profile.id)
        .single();

      if (!patientAssignment) {
        return NextResponse.json(
          { error: 'Unauthorized - Patient is not assigned to you' },
          { status: 403 }
        );
      }
    }
    // Admins can access all sessions

    return NextResponse.json(
      { session: session as CanvasSession },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sessions/[sessionId]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sessions/[sessionId]
 * 
 * Update session data (canvas state)
 * Verify access permissions before updating
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<UpdateSessionResponse | ErrorResponse>> {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const { data: canvasState } = body;

    // Check authorization
    const { authorized, profile } = await hasRole(['therapist', 'patient', 'admin']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get existing session to verify access
    const { data: existingSession, error: fetchError } = await supabase
      .from('imodes_session')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify access permissions (same as GET)
    if (profile.role === 'patient') {
      if (existingSession.patient_id !== profile.id) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only update your own sessions' },
          { status: 403 }
        );
      }
    } else if (profile.role === 'therapist') {
      if (existingSession.therapist_id !== profile.id) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only update sessions where you are the therapist' },
          { status: 403 }
        );
      }

      const { data: patientAssignment } = await supabase
        .from('patients')
        .select('id')
        .eq('id', existingSession.patient_id)
        .eq('therapist_id', profile.id)
        .single();

      if (!patientAssignment) {
        return NextResponse.json(
          { error: 'Unauthorized - Patient is not assigned to you' },
          { status: 403 }
        );
      }
    }

    // Update session data
    const { data: updatedSession, error: updateError } = await supabase
      .from('imodes_session')
      .update({
        data: canvasState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { session: updatedSession as CanvasSession },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/sessions/[sessionId]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[sessionId]
 * 
 * Delete a session
 * Verify access permissions before deleting
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ success: boolean } | ErrorResponse>> {
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

    // Get existing session to verify access
    const { data: existingSession, error: fetchError } = await supabase
      .from('imodes_session')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify access permissions (same as GET)
    if (profile.role === 'patient') {
      if (existingSession.patient_id !== profile.id) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only delete your own sessions' },
          { status: 403 }
        );
      }
    } else if (profile.role === 'therapist') {
      if (existingSession.therapist_id !== profile.id) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only delete sessions where you are the therapist' },
          { status: 403 }
        );
      }

      const { data: patientAssignment } = await supabase
        .from('patients')
        .select('id')
        .eq('id', existingSession.patient_id)
        .eq('therapist_id', profile.id)
        .single();

      if (!patientAssignment) {
        return NextResponse.json(
          { error: 'Unauthorized - Patient is not assigned to you' },
          { status: 403 }
        );
      }
    }
    // Admins can delete all sessions

    // Delete session
    const { error: deleteError } = await supabase
      .from('imodes_session')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Error deleting session:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/sessions/[sessionId]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

