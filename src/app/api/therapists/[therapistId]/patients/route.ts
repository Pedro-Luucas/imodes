import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { hasRole } from '@/lib/roleAuth';
import type { GetPatientsResponse, ErrorResponse, Profile } from '@/types/auth';

type RouteContext = {
  params: Promise<{ therapistId: string }>;
};

/**
 * GET /api/therapists/[therapistId]/patients
 * 
 * Gets all patients assigned to a specific therapist
 * Therapists can see their own patients, admins can see all
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<GetPatientsResponse | ErrorResponse>> {
  try {
    const { therapistId } = await context.params;
    console.log('Fetching patients for therapist:', therapistId);

    // Check authorization
    const { authorized, profile } = await hasRole(['therapist', 'admin']);
    
    if (!authorized || !profile) {
      console.error('Authorization failed:', { 
        authorized, 
        hasProfile: !!profile,
        therapistId,
      });
      return NextResponse.json(
        { error: 'Unauthorized - Only therapists and admins can access this endpoint' },
        { status: 403 }
      );
    }
    
    console.log('User authorized:', { userId: profile.id, role: profile.role });

    // Authorization check: therapists can only view their own patients
    if (profile.role === 'therapist' && profile.id !== therapistId) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only view your own patients' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Optimized: Use a single SQL query with JOIN via RPC for best performance
    // Falls back to optimized two-query approach if RPC doesn't exist
    let profiles: Profile[] | null = null;

    // Try using RPC function first (fastest - single query with JOIN)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_therapist_patients', {
      p_therapist_id: therapistId
    });

    // Check if RPC function exists and worked
    // If rpcError exists (even if it's an empty object), use fallback
    // If rpcData is an array (even if empty), RPC worked
    const rpcWorked = !rpcError && Array.isArray(rpcData);
    
    if (rpcWorked) {
      // RPC function exists and returned data successfully
      profiles = rpcData;
    } else {
      // RPC function doesn't exist or failed - use fallback approach
      // This is expected if the migration hasn't been run yet
      if (rpcError) {
        const errorMsg = (rpcError as { message?: string })?.message || 
                        (rpcError as { code?: string })?.code || 
                        'Function may not exist';
        console.log('RPC function not available, using fallback:', errorMsg);
      }

      // Fallback: Optimized two-query approach
      // Query 1: Get patient IDs (lightweight, only ID column - should be fast with index on therapist_id)
      const { data: patientIds, error: idsError } = await supabase
        .from('patients')
        .select('id')
        .eq('therapist_id', therapistId);

      if (idsError) {
        console.error('Error fetching patient IDs:', idsError);
        return NextResponse.json(
          { error: 'Failed to fetch patients' },
          { status: 500 }
        );
      }

      if (!patientIds || patientIds.length === 0) {
        // Early return for empty result
        console.log('No patients found for therapist:', therapistId);
        return NextResponse.json(
          { patients: [] },
          { status: 200 }
        );
      }

      // Query 2: Get full profiles (efficient with .in() - should use index on id)
      // Note: phone is not in profiles table, it's in therapists table
      const patientIdList = patientIds.map(p => p.id);
      const { data: profileData, error: profilesError } = await supabase
        .from('profiles')
        .select('id,role,full_name,first_name,email,avatar_url,is_active,subscription_active,settings,created_at,updated_at')
        .in('id', patientIdList)
        .eq('role', 'patient')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching patient profiles:', profilesError);
        return NextResponse.json(
          { error: 'Failed to fetch patient profiles' },
          { status: 500 }
        );
      }

      profiles = profileData;
    }

    console.log('Successfully fetched patients:', profiles?.length || 0);
    return NextResponse.json(
      { patients: profiles || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/therapists/[therapistId]/patients:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

