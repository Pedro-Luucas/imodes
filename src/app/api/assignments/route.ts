import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { hasRole } from '@/lib/roleAuth';
import { createAssignmentSchema } from '@/lib/validations';
import type { CreateAssignmentResponse, ErrorResponse, Assignment } from '@/types/auth';

/**
 * POST /api/assignments
 * 
 * Creates a new assignment for a patient
 * Only therapists can create assignments, and only for their own patients
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateAssignmentResponse | ErrorResponse>> {
  try {
    // Check authorization - only therapists can create assignments
    const { authorized, profile } = await hasRole(['therapist']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized - Only therapists can create assignments' },
        { status: 403 }
      );
    }

    const therapistId = profile.id;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createAssignmentSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err) => err.message).join(', ');
      return NextResponse.json(
        { error: `Validation error: ${errors}` },
        { status: 400 }
      );
    }

    const { patient_id, name, description, due_date } = validationResult.data;

    const supabase = createSupabaseServerClient();

    // Verify that the patient belongs to this therapist
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, therapist_id')
      .eq('id', patient_id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    if (patient.therapist_id !== therapistId) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only create assignments for your own patients' },
        { status: 403 }
      );
    }

    // Create the assignment
    const { data: assignment, error: insertError } = await supabase
      .from('assignments')
      .insert({
        therapist_id: therapistId,
        patient_id,
        name,
        description: description || null,
        due_date,
      })
      .select()
      .single();

    if (insertError || !assignment) {
      console.error('Error creating assignment:', insertError);
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Assignment created successfully',
        assignment: assignment as Assignment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/assignments:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

