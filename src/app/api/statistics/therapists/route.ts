import { NextResponse } from 'next/server';
import { hasRole } from '@/lib/roleAuth';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

/**
 * GET /api/statistics/therapists
 * 
 * Returns total, active, and inactive therapist counts
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

    // Get total count of therapists
    const { count: total, error: totalError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'therapist');

    if (totalError) {
      console.error('Error fetching total therapists:', totalError);
      return NextResponse.json(
        { error: 'Failed to fetch therapist statistics' },
        { status: 500 }
      );
    }

    // Get count of active therapists
    const { count: active, error: activeError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'therapist')
      .eq('is_active', true);

    if (activeError) {
      console.error('Error fetching active therapists:', activeError);
      return NextResponse.json(
        { error: 'Failed to fetch therapist statistics' },
        { status: 500 }
      );
    }

    // Get count of inactive therapists
    const { count: inactive, error: inactiveError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'therapist')
      .eq('is_active', false);

    if (inactiveError) {
      console.error('Error fetching inactive therapists:', inactiveError);
      return NextResponse.json(
        { error: 'Failed to fetch therapist statistics' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        total: total || 0,
        active: active || 0,
        inactive: inactive || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/statistics/therapists:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

