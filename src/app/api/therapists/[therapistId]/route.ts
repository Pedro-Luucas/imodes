import { NextRequest, NextResponse } from 'next/server';
import { hasRole, getUserProfile } from '@/lib/roleAuth';
import type { GetProfileResponse, ErrorResponse } from '@/types/auth';

type RouteContext = {
  params: Promise<{ therapistId: string }>;
};

/**
 * GET /api/therapists/[therapistId]
 * 
 * Gets a therapist's profile
 * Therapists can see all therapist profiles, patients can see their assigned therapist, admins can see all
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<GetProfileResponse | ErrorResponse>> {
  try {
    const { therapistId } = await context.params;

    // Check authorization
    const { authorized, profile: requestingUserProfile } = await hasRole(['therapist', 'patient', 'admin']);
    
    if (!authorized || !requestingUserProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get therapist profile
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

    // Authorization check for patients: they can only view their assigned therapist
    if (requestingUserProfile.role === 'patient') {
      if (requestingUserProfile.therapist_id !== therapistId) {
        return NextResponse.json(
          { error: 'Unauthorized - You can only view your assigned therapist' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { profile: therapist },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/therapists/[therapistId]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

