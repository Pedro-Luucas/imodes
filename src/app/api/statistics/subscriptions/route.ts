import { NextResponse } from 'next/server';
import { hasRole } from '@/lib/roleAuth';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

/**
 * GET /api/statistics/subscriptions
 * 
 * Returns subscription active and inactive counts across all profiles
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

    // Get count of active subscriptions
    const { count: active, error: activeError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_active', true);

    if (activeError) {
      console.error('Error fetching active subscriptions:', activeError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription statistics' },
        { status: 500 }
      );
    }

    // Get count of inactive subscriptions
    const { count: inactive, error: inactiveError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_active', false);

    if (inactiveError) {
      console.error('Error fetching inactive subscriptions:', inactiveError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription statistics' },
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
    console.error('Error in GET /api/statistics/subscriptions:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

