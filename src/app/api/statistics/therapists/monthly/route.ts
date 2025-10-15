import { NextResponse } from 'next/server';
import { hasRole } from '@/lib/roleAuth';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

/**
 * GET /api/statistics/therapists/monthly
 * 
 * Returns the number of therapists registered this month
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

    // Get the first day of the current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayISO = firstDayOfMonth.toISOString();

    // Get count of therapists registered this month
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'therapist')
      .gte('created_at', firstDayISO);

    if (error) {
      console.error('Error fetching monthly therapists:', error);
      return NextResponse.json(
        { error: 'Failed to fetch monthly therapist statistics' },
        { status: 500 }
      );
    }

    // Format month as YYYY-MM
    const monthString = `${year}-${String(month + 1).padStart(2, '0')}`;

    return NextResponse.json(
      {
        count: count || 0,
        month: monthString,
        year: year,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/statistics/therapists/monthly:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

