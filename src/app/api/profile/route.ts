import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { updateProfileSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import type { UpdateProfileResponse, ErrorResponse } from '@/types/auth';

/**
 * GET /api/profile
 * 
 * Protected route that returns the authenticated user's profile from public.profiles
 * Requires valid session cookie
 */
export async function GET() {
  try {
    // Get user from cookie
    const user = await getUserFromCookie();

    // Check if user is authenticated
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing session token' },
        { status: 401 }
      );
    }

    // Get user ID
    const userId = user.id;

    // Create Supabase client
    const supabase = createSupabaseServerClient();

    // Query public.profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile from database:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile from database' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Fetch phone from therapists table if user is a therapist
    if (profile.role === 'therapist') {
      const { data: therapistData } = await supabase
        .from('therapists')
        .select('phone')
        .eq('id', userId)
        .single();

      if (therapistData) {
        profile.phone = therapistData.phone;
      }
    }

    // Fetch therapist_id from patients table if user is a patient
    if (profile.role === 'patient') {
      const { data: patientData } = await supabase
        .from('patients')
        .select('therapist_id')
        .eq('id', userId)
        .single();

      if (patientData) {
        profile.therapist_id = patientData.therapist_id;
      }
    }

    // Return profile data
    return NextResponse.json(
      { profile },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 * 
 * Updates the authenticated user's profile information
 * Requires valid session cookie
 */
export async function PATCH(
  request: NextRequest
): Promise<NextResponse<UpdateProfileResponse | ErrorResponse>> {
  try {
    // Get user from cookie
    const user = await getUserFromCookie();

    // Check if user is authenticated
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing session token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate input with Zod
    const validatedData = updateProfileSchema.parse(body);

    // Check if there's anything to update
    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createSupabaseServerClient();

    // Separate phone from other profile fields
    const { phone, ...profileUpdates } = validatedData;

    // Update profile fields in profiles table
    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }
    }

    // Update phone in therapists table if provided
    if (phone !== undefined) {
      const { error: therapistError } = await supabase
        .from('therapists')
        .update({ phone })
        .eq('id', user.id);

      if (therapistError) {
        console.error('Error updating therapist phone:', therapistError);
        return NextResponse.json(
          { error: 'Failed to update phone number' },
          { status: 500 }
        );
      }
    }

    // Fetch updated profile to return
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError || !updatedProfile) {
      console.error('Error fetching updated profile:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated profile' },
        { status: 500 }
      );
    }

    // Fetch phone from therapists table if user is a therapist
    if (updatedProfile.role === 'therapist') {
      const { data: therapistData } = await supabase
        .from('therapists')
        .select('phone')
        .eq('id', user.id)
        .single();

      if (therapistData) {
        updatedProfile.phone = therapistData.phone;
      }
    }

    // Fetch therapist_id from patients table if user is a patient
    if (updatedProfile.role === 'patient') {
      const { data: patientData } = await supabase
        .from('patients')
        .select('therapist_id')
        .eq('id', user.id)
        .single();

      if (patientData) {
        updatedProfile.therapist_id = patientData.therapist_id;
      }
    }

    return NextResponse.json(
      {
        message: 'Profile updated successfully',
        profile: updatedProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        } as ErrorResponse & { details: Array<{ field: string; message: string }> },
        { status: 400 }
      );
    }

    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
