import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import type { ErrorResponse } from '@/types/auth';

type CreateDemoRequest = {
  full_name: string;
  first_name: string;
  email: string;
  role: 'therapist' | 'patient' | 'student' | 'professor';
};

type CreateDemoResponse = {
  sessionId: string;
  demoUserId: string;
  message: string;
};

/**
 * POST /api/demonstration/create
 * 
 * Creates a demo lead and playground session for demonstration purposes
 * - Saves lead data to demo_users table (for future marketing/email campaigns)
 * - Creates a playground session without requiring user authentication
 * - Returns sessionId to redirect to canvas
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateDemoResponse | ErrorResponse>> {
  try {
    const body = await request.json();
    const { full_name, first_name, email, role } = body as CreateDemoRequest;

    // Validation
    if (!full_name || !first_name || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['therapist', 'patient', 'student', 'professor'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be therapist, patient, student, or professor' },
        { status: 400 }
      );
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Generate a temporary session ID (not persisted in DB)
    // This will be used only in memory/localStorage
    const tempSessionId = `demo-${crypto.randomUUID()}`;

    // Save lead data to demo_users table (only form data, no session in DB)
    // Note: If table doesn't exist yet, we'll still return success with temp session ID
    const { data: demoUser, error: demoUserError } = await supabase
      .from('demo_users')
      .insert({
        full_name,
        first_name,
        email,
        role,
        session_id: tempSessionId, // Store temp session ID as text
        metadata: {
          source: 'demonstration_wizard',
          created_via: 'workshop_masterclass',
          temp_session_id: tempSessionId,
        },
      })
      .select()
      .single();

    if (demoUserError) {
      console.error('Error creating demo user (table may not exist yet):', demoUserError);
      // Continue anyway - the demo session will still work without saving lead data
      // The user can still use the canvas, we just won't have their data for marketing
    }

    return NextResponse.json(
      {
        sessionId: tempSessionId, // Return temp session ID for client-side use
        demoUserId: demoUser?.id || 'not-saved',
        message: 'Demo session created successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/demonstration/create:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
