import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { getUserFromCookie } from '@/lib/auth';
import { NotificationType } from '@/types/notifications';

/**
 * POST /api/therapists/request
 * Send a therapist assignment request from patient
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { therapistId } = body;

    if (!therapistId) {
      return NextResponse.json(
        { error: 'Therapist ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get patient profile
    const { data: patientProfile, error: patientError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (patientError || !patientProfile) {
      return NextResponse.json(
        { error: 'Patient profile not found' },
        { status: 404 }
      );
    }

    // Verify patient role
    if (patientProfile.role !== 'patient') {
      return NextResponse.json(
        { error: 'Only patients can send therapist requests' },
        { status: 403 }
      );
    }

    // Check if patient already has a therapist
    const { data: patientData } = await supabase
      .from('patients')
      .select('therapist_id')
      .eq('id', user.id)
      .single();

    if (patientData?.therapist_id) {
      return NextResponse.json(
        { error: 'You already have an assigned therapist' },
        { status: 400 }
      );
    }

    // Get therapist profile
    const { data: therapistProfile, error: therapistError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', therapistId)
      .single();

    if (therapistError || !therapistProfile) {
      return NextResponse.json(
        { error: 'Therapist not found' },
        { status: 404 }
      );
    }

    // Verify therapist role
    if (therapistProfile.role !== 'therapist') {
      return NextResponse.json(
        { error: 'Selected user is not a therapist' },
        { status: 400 }
      );
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', therapistId)
      .eq('type', NotificationType.THERAPIST_REQUEST)
      .eq('data->>patient_id', user.id)
      .is('data->>status', null)
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending request with this therapist' },
        { status: 400 }
      );
    }

    // Create notification for therapist
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: therapistId,
        type: NotificationType.THERAPIST_REQUEST,
        title: 'New Patient Request',
        message: `${patientProfile.full_name} wants to work with you as their therapist`,
        data: {
          patient_id: user.id,
          patient_name: patientProfile.full_name,
          patient_email: patientProfile.email,
          status: 'pending',
        },
        link: null,
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return NextResponse.json(
        { error: 'Failed to send request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Request sent successfully',
      notification,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

