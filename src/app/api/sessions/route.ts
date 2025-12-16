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
export async function GET(
  request: NextRequest
): Promise<NextResponse<GetSessionsResponse | ErrorResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const requestedType = searchParams.get('type')?.trim() || null;
    const limitParam = searchParams.get('limit');
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const limit =
      parsedLimit && Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : undefined;
        

    // Check authorization
    const { authorized, profile } = await hasRole(['therapist', 'patient', 'admin']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Select all columns including type
    let query = supabase
      .from('imodes_session')
      .select('id, patient_id, therapist_id, name, status, type, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (profile.role === 'patient') {
      // Patients see their own therapy sessions only
      query = query.eq('patient_id', profile.id).eq('type', 'session');
    } else if (profile.role === 'therapist') {
      // Therapists see sessions where they are the therapist
      // This includes sessions with patients AND playground sessions (no patient)
      query = query.eq('therapist_id', profile.id);

      if (requestedType) {
        query = query.eq('type', requestedType);
      }
    } else if (requestedType) {
      // Admin filtering by type when requested
      query = query.eq('type', requestedType);
    }
    // Admins can see all sessions (no filter otherwise)

    if (limit) {
      query = query.limit(limit);
    }

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
    const { name, patient_id, type } = body;

    const supabase = createSupabaseServerClient();
    let patientId: string | null | undefined;
    let therapistId: string;
    let sessionType: string;

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
      sessionType = type || 'session';
    } else if (profile.role === 'therapist') {
      // Therapists: patient_id is optional, can be provided in body or null
      therapistId = profile.id;
      patientId = patient_id !== undefined ? patient_id : null;
      
      // Auto-set type based on whether patient is selected
      if (patientId === null || patientId === undefined) {
        sessionType = 'playground';
      } else {
        sessionType = type || 'session';
      }
    } else {
      // Admin - would need patient_id and therapist_id in body
      if (!body.therapist_id) {
        return NextResponse.json(
          { error: 'therapist_id is required for admin users' },
          { status: 400 }
        );
      }
      patientId = body.patient_id || null;
      therapistId = body.therapist_id;
      sessionType = type || (patientId ? 'session' : 'playground');
    }

    // Auto-generate name if not provided
    const sessionName = name || `Session - ${new Date().toLocaleDateString()}`;

    // Initialize empty canvas state
    // Default zoom is 60% actual which displays as 100% (with +40 offset)
    const emptyState: CanvasState = {
      cards: [],
      notes: [],
      gender: 'male',
      patientSettings: {
        zoomLevel: 60,
      },
      therapistSettings: {
        zoomLevel: 60,
      },
      version: 0,
      updatedAt: new Date().toISOString(),
    };

    // Create session - handle name and type columns gracefully
    const insertData: {
      patient_id?: string | null;
      therapist_id: string;
      status: string;
      type: string;
      data: CanvasState;
      name?: string;
    } = {
      therapist_id: therapistId,
      status: 'active',
      type: sessionType,
      data: emptyState,
    };
    
    // Include patient_id only if provided (can be null for playground sessions)
    if (patientId !== undefined) {
      insertData.patient_id = patientId;
    }
    
    // Only include name if provided
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

