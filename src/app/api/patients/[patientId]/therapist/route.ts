import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { hasRole, getUserProfile } from '@/lib/roleAuth';
import type {
  AssignTherapistRequest,
  AssignTherapistResponse,
  GetTherapistResponse,
  UnassignTherapistResponse,
  ErrorResponse,
} from '@/types/auth';

type RouteContext = {
  params: Promise<{ patientId: string }>;
};

/**
 * POST /api/patients/[patientId]/therapist
 * 
 * Assigns a therapist to a patient
 * Only therapists and admins can assign
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<AssignTherapistResponse | ErrorResponse>> {
  try {
    const { patientId } = await context.params;

    // Check authorization - only therapists and admins
    const { authorized, profile } = await hasRole(['therapist', 'admin']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized - Only therapists and admins can assign patients' },
        { status: 403 }
      );
    }

    // Get therapist ID from request body
    const body = await request.json() as AssignTherapistRequest;
    const { therapistId } = body;

    if (!therapistId) {
      return NextResponse.json(
        { error: 'therapistId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Verify patient exists and is a patient
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

    // Verify therapist exists and is a therapist
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

    // Assign therapist to patient in the patients table
    const { error } = await supabase
      .from('patients')
      .upsert(
        { 
          id: patientId, 
          therapist_id: therapistId 
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error assigning therapist:', error);
      return NextResponse.json(
        { error: 'Failed to assign therapist' },
        { status: 500 }
      );
    }

    // Update therapist's patients array
    // First get current patients array
    const { data: therapistData, error: therapistFetchError } = await supabase
      .from('therapists')
      .select('patients')
      .eq('id', therapistId)
      .single();

    if (therapistFetchError) {
      console.error('Error fetching therapist data:', therapistFetchError);
    } else {
      // Add patient to therapist's patients array if not already there
      const currentPatients = therapistData?.patients || [];
      if (!currentPatients.includes(patientId)) {
        const { error: updateError } = await supabase
          .from('therapists')
          .upsert({
            id: therapistId,
            patients: [...currentPatients, patientId]
          }, { onConflict: 'id' });

        if (updateError) {
          console.error('Error updating therapist patients array:', updateError);
          // Don't fail the request, just log the error
        }
      }
    }

    // Get the updated patient profile
    const updatedPatient = await getUserProfile(patientId);

    return NextResponse.json(
      {
        message: 'Therapist assigned successfully',
        patient: updatedPatient || patient,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/patients/[patientId]/therapist:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/patients/[patientId]/therapist
 * 
 * Gets the therapist assigned to a patient
 * Patients can see their own therapist, therapists can see their assigned patients' therapist
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<GetTherapistResponse | ErrorResponse>> {
  try {
    const { patientId } = await context.params;

    // Check authorization
    const { authorized, profile } = await hasRole(['therapist', 'patient', 'admin']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get patient's profile
    const patient = await getUserProfile(patientId);
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Authorization check: patients can only view their own therapist
    if (profile.role === 'patient' && profile.id !== patientId) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only view your own therapist' },
        { status: 403 }
      );
    }

    // Get therapist assignment from patients table
    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .select('therapist_id')
      .eq('id', patientId)
      .single();

    if (patientError || !patientData || !patientData.therapist_id) {
      return NextResponse.json(
        { therapist: null },
        { status: 200 }
      );
    }

    const therapist = await getUserProfile(patientData.therapist_id);

    return NextResponse.json(
      { therapist },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/patients/[patientId]/therapist:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/patients/[patientId]/therapist
 * 
 * Unassigns a therapist from a patient
 * Only therapists and admins can unassign
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<UnassignTherapistResponse | ErrorResponse>> {
  try {
    const { patientId } = await context.params;

    // Check authorization - only therapists and admins
    const { authorized, profile } = await hasRole(['therapist', 'admin']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized - Only therapists and admins can unassign patients' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Verify patient exists
    const patient = await getUserProfile(patientId);
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Check if patient has a therapist
    const { data: patientData } = await supabase
      .from('patients')
      .select('therapist_id')
      .eq('id', patientId)
      .single();

    if (!patientData || !patientData.therapist_id) {
      return NextResponse.json(
        { error: 'Patient does not have a therapist assigned' },
        { status: 400 }
      );
    }

    const oldTherapistId = patientData.therapist_id;

    // Unassign therapist from patient
    const { error } = await supabase
      .from('patients')
      .update({ therapist_id: null })
      .eq('id', patientId);

    if (error) {
      console.error('Error unassigning therapist:', error);
      return NextResponse.json(
        { error: 'Failed to unassign therapist' },
        { status: 500 }
      );
    }

    // Remove patient from therapist's patients array
    const { data: therapistData, error: therapistFetchError } = await supabase
      .from('therapists')
      .select('patients')
      .eq('id', oldTherapistId)
      .single();

    if (!therapistFetchError && therapistData) {
      const currentPatients = therapistData.patients || [];
      const updatedPatients = currentPatients.filter((id: string) => id !== patientId);
      
      const { error: updateError } = await supabase
        .from('therapists')
        .update({ patients: updatedPatients })
        .eq('id', oldTherapistId);

      if (updateError) {
        console.error('Error updating therapist patients array:', updateError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json(
      { message: 'Therapist unassigned successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/patients/[patientId]/therapist:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/patients/[patientId]/therapist
 * 
 * Updates/changes a patient's therapist
 * Only therapists and admins can update
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<AssignTherapistResponse | ErrorResponse>> {
  try {
    const { patientId } = await context.params;

    // Check authorization - only therapists and admins
    const { authorized, profile } = await hasRole(['therapist', 'admin']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized - Only therapists and admins can update patient assignments' },
        { status: 403 }
      );
    }

    // Get new therapist ID from request body
    const body = await request.json() as AssignTherapistRequest;
    const { therapistId } = body;

    if (!therapistId) {
      return NextResponse.json(
        { error: 'therapistId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Verify patient exists
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

    // Get current therapist assignment
    const { data: currentPatientData } = await supabase
      .from('patients')
      .select('therapist_id')
      .eq('id', patientId)
      .single();

    const oldTherapistId = currentPatientData?.therapist_id;

    // Verify new therapist exists and is a therapist
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

    // Update therapist assignment in patients table
    const { error } = await supabase
      .from('patients')
      .upsert(
        { 
          id: patientId, 
          therapist_id: therapistId 
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.error('Error updating therapist:', error);
      return NextResponse.json(
        { error: 'Failed to update therapist' },
        { status: 500 }
      );
    }

    // Remove patient from old therapist's patients array
    if (oldTherapistId && oldTherapistId !== therapistId) {
      const { data: oldTherapistData, error: oldTherapistFetchError } = await supabase
        .from('therapists')
        .select('patients')
        .eq('id', oldTherapistId)
        .single();

      if (!oldTherapistFetchError && oldTherapistData) {
        const currentPatients = oldTherapistData.patients || [];
        const updatedPatients = currentPatients.filter((id: string) => id !== patientId);
        
        await supabase
          .from('therapists')
          .update({ patients: updatedPatients })
          .eq('id', oldTherapistId);
      }
    }

    // Add patient to new therapist's patients array
    const { data: newTherapistData, error: newTherapistFetchError } = await supabase
      .from('therapists')
      .select('patients')
      .eq('id', therapistId)
      .single();

    if (!newTherapistFetchError && newTherapistData) {
      const currentPatients = newTherapistData.patients || [];
      if (!currentPatients.includes(patientId)) {
        await supabase
          .from('therapists')
          .upsert({
            id: therapistId,
            patients: [...currentPatients, patientId]
          }, { onConflict: 'id' });
      }
    }

    // Get the updated patient profile
    const updatedPatient = await getUserProfile(patientId);

    return NextResponse.json(
      {
        message: 'Therapist updated successfully',
        patient: updatedPatient || patient,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/patients/[patientId]/therapist:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

