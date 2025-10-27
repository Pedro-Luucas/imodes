import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { getUserFromCookie } from '@/lib/auth';
import { NotificationType } from '@/types/notifications';

/**
 * POST /api/therapists/request/[requestId]
 * Accept or reject a therapist assignment request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body; // 'accept' or 'reject'
    const { requestId } = await params;

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "reject"' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get therapist profile
    const { data: therapistProfile, error: therapistError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (therapistError || !therapistProfile) {
      return NextResponse.json(
        { error: 'Therapist profile not found' },
        { status: 404 }
      );
    }

    // Verify therapist role
    if (therapistProfile.role !== 'therapist') {
      return NextResponse.json(
        { error: 'Only therapists can respond to requests' },
        { status: 403 }
      );
    }

    // Get the notification/request
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .eq('type', NotificationType.THERAPIST_REQUEST)
      .single();

    if (notificationError || !notification) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (notification.data?.status && notification.data.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been processed' },
        { status: 400 }
      );
    }

    const patientId = notification.data?.patient_id as string;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      // Check if patient already has a therapist
      const { data: patientData } = await supabase
        .from('patients')
        .select('therapist_id')
        .eq('id', patientId)
        .single();

      if (patientData?.therapist_id) {
        // Update notification status
        await supabase
          .from('notifications')
          .update({
            data: {
              ...notification.data,
              status: 'expired',
            },
          })
          .eq('id', requestId);

        return NextResponse.json(
          { error: 'This patient already has an assigned therapist' },
          { status: 400 }
        );
      }

      // Assign therapist to patient in patients table
      const { error: updateError } = await supabase
        .from('patients')
        .upsert(
          { 
            id: patientId, 
            therapist_id: user.id 
          },
          { onConflict: 'id' }
        );

      if (updateError) {
        console.error('Error assigning therapist:', updateError);
        return NextResponse.json(
          { error: 'Failed to assign therapist' },
          { status: 500 }
        );
      }

      // Update therapist's patients array
      const { data: therapistData, error: therapistFetchError } = await supabase
        .from('therapists')
        .select('patients')
        .eq('id', user.id)
        .single();

      if (!therapistFetchError && therapistData) {
        const currentPatients = therapistData.patients || [];
        if (!currentPatients.includes(patientId)) {
          const { error: therapistUpdateError } = await supabase
            .from('therapists')
            .upsert({
              id: user.id,
              patients: [...currentPatients, patientId]
            }, { onConflict: 'id' });

          if (therapistUpdateError) {
            console.error('Error updating therapist patients array:', therapistUpdateError);
            // Don't fail the request, just log the error
          }
        }
      }

      // Update notification status to accepted
      await supabase
        .from('notifications')
        .update({
          data: {
            ...notification.data,
            status: 'accepted',
          },
        })
        .eq('id', requestId);

      // Send acceptance notification to patient
      await supabase
        .from('notifications')
        .insert({
          user_id: patientId,
          type: NotificationType.THERAPIST_REQUEST_ACCEPTED,
          title: 'Therapist Request Accepted',
          message: `${therapistProfile.full_name} has accepted your request and is now your therapist!`,
          data: {
            therapist_id: user.id,
            therapist_name: therapistProfile.full_name,
          },
          link: '/dashboard-patient',
        });

      return NextResponse.json({
        message: 'Request accepted successfully',
        action: 'accepted',
      });
    } else {
      // Reject the request
      // Update notification status to rejected
      await supabase
        .from('notifications')
        .update({
          data: {
            ...notification.data,
            status: 'rejected',
          },
        })
        .eq('id', requestId);

      // Send rejection notification to patient
      await supabase
        .from('notifications')
        .insert({
          user_id: patientId,
          type: NotificationType.THERAPIST_REQUEST_REJECTED,
          title: 'Therapist Request Declined',
          message: `${therapistProfile.full_name} has declined your request. Please try selecting another therapist.`,
          data: {
            therapist_id: user.id,
            therapist_name: therapistProfile.full_name,
          },
          link: '/dashboard-patient/no-therapist',
        });

      return NextResponse.json({
        message: 'Request rejected successfully',
        action: 'rejected',
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

