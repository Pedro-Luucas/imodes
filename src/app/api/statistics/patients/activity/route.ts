import { NextResponse } from 'next/server';
import { hasRole } from '@/lib/roleAuth';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

/**
 * GET /api/statistics/patients/activity
 * 
 * Returns active and inactive patient counts
 * Only accessible by therapists and admins
 */
export async function GET() {
  try {
    // Check authorization
    const { authorized } = await hasRole(['therapist', 'admin']);
    
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Therapist or admin access required' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get count of active patients
    const { count: active, error: activeError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'patient')
      .eq('is_active', true);

    if (activeError) {
      console.error('Error fetching active patients:', activeError);
      return NextResponse.json(
        { error: 'Failed to fetch patient activity statistics' },
        { status: 500 }
      );
    }

    // Get count of inactive patients
    const { count: inactive, error: inactiveError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'patient')
      .eq('is_active', false);

    if (inactiveError) {
      console.error('Error fetching inactive patients:', inactiveError);
      return NextResponse.json(
        { error: 'Failed to fetch patient activity statistics' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        active: active || 0,
        inactive: inactive || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/statistics/patients/activity:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

