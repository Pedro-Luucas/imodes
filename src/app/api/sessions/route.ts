import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { hasRole } from '@/lib/roleAuth';
import type { CanvasSession, CanvasState } from '@/types/canvas';

type ErrorResponse = {
  error: string;
};

type GetSessionsResponse = {
  sessions: Omit<CanvasSession, 'data'>[];
};

type CreateSessionResponse = {
  session: CanvasSession;
};

/**
 * GET /api/sessions
 * 
 * List sessions for the authenticated user
 * Patients see their own sessions
 * Therapists see sessions for their patients
 */
export async function GET(): Promise<NextResponse<GetSessionsResponse | ErrorResponse>> {
  try {
    // Check authorization
    const { authorized, profile } = await hasRole(['therapist', 'patient', 'admin']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Select all columns - name will be included if it exists in the schema
    let query = supabase
      .from('imodes_session')
      .select('id, patient_id, therapist_id, name, status, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (profile.role === 'patient') {
      // Patients see their own sessions
      query = query.eq('patient_id', profile.id);
    } else if (profile.role === 'therapist') {
      // Therapists see sessions for their patients
      // First get all patient IDs for this therapist
      const { data: patientAssignments } = await supabase
        .from('patients')
        .select('id')
        .eq('therapist_id', profile.id);

      if (!patientAssignments || patientAssignments.length === 0) {
        return NextResponse.json(
          { sessions: [] },
          { status: 200 }
        );
      }

      const patientIds = patientAssignments.map(p => p.id);
      query = query.in('patient_id', patientIds).eq('therapist_id', profile.id);
    }
    // Admins can see all sessions (no filter)

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { sessions: sessions || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sessions:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions
 * 
 * Create a new session
 * Patients: fetch therapist_id from their assigned therapist
 * Therapists: use first patient from their patients list (temporary)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateSessionResponse | ErrorResponse>> {
  try {
    // Check authorization
    const { authorized, profile } = await hasRole(['therapist', 'patient', 'admin']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    const supabase = createSupabaseServerClient();
    let patientId: string;
    let therapistId: string;

    if (profile.role === 'patient') {
      // Patients: fetch therapist_id from their assigned therapist
      patientId = profile.id;
      
      const { data: patientData } = await supabase
        .from('patients')
        .select('therapist_id')
        .eq('id', patientId)
        .single();

      if (!patientData || !patientData.therapist_id) {
        return NextResponse.json(
          { error: 'No therapist assigned. Please assign a therapist first.' },
          { status: 400 }
        );
      }

      therapistId = patientData.therapist_id;
    } else if (profile.role === 'therapist') {
      // Therapists: use first patient from their patients list (temporary)
      therapistId = profile.id;
      
      const { data: patientAssignments } = await supabase
        .from('patients')
        .select('id')
        .eq('therapist_id', therapistId)
        .limit(1)
        .single();

      if (!patientAssignments) {
        return NextResponse.json(
          { error: 'No patients assigned. Please assign a patient first.' },
          { status: 400 }
        );
      }

      patientId = patientAssignments.id;
    } else {
      // Admin - would need patient_id and therapist_id in body
      if (!body.patient_id || !body.therapist_id) {
        return NextResponse.json(
          { error: 'patient_id and therapist_id are required for admin users' },
          { status: 400 }
        );
      }
      patientId = body.patient_id;
      therapistId = body.therapist_id;
    }

    // Auto-generate name if not provided
    const sessionName = name || `Session - ${new Date().toLocaleDateString()}`;

    // Initialize empty canvas state
    const emptyState: CanvasState = {
      cards: [],
      gender: 'male',
      patientSettings: {
        zoomLevel: 100,
      },
      therapistSettings: {
        zoomLevel: 100,
      },
    };

    // Create session - handle name column gracefully
    const insertData: {
      patient_id: string;
      therapist_id: string;
      status: string;
      data: CanvasState;
      name?: string;
    } = {
      patient_id: patientId,
      therapist_id: therapistId,
      status: 'playground',
      data: emptyState,
    };
    
    // Only include name if provided (column might not exist yet)
    if (sessionName) {
      insertData.name = sessionName;
    }

    const { data: session, error } = await supabase
      .from('imodes_session')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { session: session as CanvasSession },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/sessions:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

