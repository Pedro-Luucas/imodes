import { NextRequest, NextResponse } from 'next/server';
import { hasRole, getUserProfile } from '@/lib/roleAuth';
import type { GetProfileResponse, ErrorResponse } from '@/types/auth';

type RouteContext = {
  params: Promise<{ patientId: string }>;
};

/**
 * GET /api/patients/[patientId]
 * 
 * Gets a patient's profile
 * Patients can see their own profile, therapists can see their assigned patients, admins can see all
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<GetProfileResponse | ErrorResponse>> {
  try {
    const { patientId } = await context.params;

    // Check authorization
    const { authorized, profile: requestingUserProfile } = await hasRole(['therapist', 'patient', 'admin']);
    
    if (!authorized || !requestingUserProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get patient profile
    const patient = await getUserProfile(patientId);
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    if (patient.role !== 'patient') {
      return NextResponse.json(
        { error: 'User is not a patient' },
        { status: 400 }
      );
    }

    // Authorization check
    if (requestingUserProfile.role === 'patient') {
      // Patients can only view their own profile
      if (requestingUserProfile.id !== patientId) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only view your own profile' },
          { status: 403 }
        );
      }
    } else if (requestingUserProfile.role === 'therapist') {
      // Therapists can only view their assigned patients
      if (patient.therapist_id !== requestingUserProfile.id) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only view your assigned patients' },
          { status: 403 }
        );
      }
    }
    // Admins can view any patient

    return NextResponse.json(
      { profile: patient },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/patients/[patientId]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

