import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { hasRole, getUserProfile } from '@/lib/roleAuth';
import type { GetPatientsResponse, ErrorResponse } from '@/types/auth';

type RouteContext = {
  params: Promise<{ therapistId: string }>;
};

/**
 * GET /api/therapists/[therapistId]/patients
 * 
 * Gets all patients assigned to a specific therapist
 * Therapists can see their own patients, admins can see all
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<GetPatientsResponse | ErrorResponse>> {
  try {
    const { therapistId } = await context.params;

    // Check authorization
    const { authorized, profile } = await hasRole(['therapist', 'admin']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized - Only therapists and admins can access this endpoint' },
        { status: 403 }
      );
    }

    // Authorization check: therapists can only view their own patients
    if (profile.role === 'therapist' && profile.id !== therapistId) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only view your own patients' },
        { status: 403 }
      );
    }

    // Verify therapist exists
    const therapist = await getUserProfile(therapistId);
    
    if (!therapist) {
      return NextResponse.json(
        { error: 'Therapist not found' },
        { status: 404 }
      );
    }

    if (therapist.role !== 'therapist') {
      return NextResponse.json(
        { error: 'User is not a therapist' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get all patients assigned to this therapist by joining patients and profiles tables
    const { data: patientAssignments, error } = await supabase
      .from('patients')
      .select('id')
      .eq('therapist_id', therapistId);

    if (error) {
      console.error('Error fetching patients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    // If no patients, return empty array
    if (!patientAssignments || patientAssignments.length === 0) {
      return NextResponse.json(
        { patients: [] },
        { status: 200 }
      );
    }

    // Get the full profiles for all assigned patients
    const patientIds = patientAssignments.map(p => p.id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', patientIds)
      .eq('role', 'patient')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching patient profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch patient profiles' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { patients: profiles || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/therapists/[therapistId]/patients:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

