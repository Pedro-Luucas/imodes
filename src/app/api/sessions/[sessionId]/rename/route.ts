'use server';

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

type RenameSessionResponse = {
  session: CanvasSession;
};

const MAX_NAME_LENGTH = 120;

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<RenameSessionResponse | ErrorResponse>> {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const proposedName = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!proposedName) {
      return NextResponse.json(
        { error: 'Session name is required' },
        { status: 400 }
      );
    }

    if (proposedName.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Session name must be <= ${MAX_NAME_LENGTH} characters` },
        { status: 400 }
      );
    }

    const { authorized, profile } = await hasRole(['therapist', 'patient', 'admin']);

    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

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

    const sessionPatientId = existingSession.patient_id ? String(existingSession.patient_id) : null;
    const sessionTherapistId = existingSession.therapist_id ? String(existingSession.therapist_id) : null;
    const profileId = String(profile.id);

    if (profile.role === 'patient') {
      if (!sessionPatientId || sessionPatientId !== profileId) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only rename your own sessions' },
          { status: 403 }
        );
      }
    } else if (profile.role === 'therapist') {
      if (!sessionTherapistId || sessionTherapistId !== profileId) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only rename sessions where you are the therapist' },
          { status: 403 }
        );
      }

      if (sessionPatientId) {
        const { data: patientAssignment } = await supabase
          .from('patients')
          .select('id')
          .eq('id', sessionPatientId)
          .eq('therapist_id', profileId)
          .single();

        if (!patientAssignment) {
          return NextResponse.json(
            { error: 'Unauthorized - Patient is not assigned to you' },
            { status: 403 }
          );
        }
      }
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('imodes_session')
      .update({
        name: proposedName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select('*')
      .single();

    if (updateError || !updatedSession) {
      console.error('Error renaming session:', updateError);
      return NextResponse.json(
        { error: 'Failed to rename session' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { session: updatedSession as CanvasSession },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/sessions/[sessionId]/rename:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


