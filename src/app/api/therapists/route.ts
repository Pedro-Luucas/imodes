import { NextRequest, NextResponse } from 'next/server';
import { hasRole } from '@/lib/roleAuth';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import type { ErrorResponse } from '@/types/auth';

interface TherapistListResponse {
  therapists: Array<{
    id: string;
    full_name: string;
    first_name: string;
    email: string;
    avatar_url?: string;
    created_at: string;
  }>;
}

/**
 * GET /api/therapists
 * 
 * Search/list all therapists
 * Query params:
 * - search: filter by name (searches in full_name and first_name)
 * 
 * Accessible to patients, therapists, and admins
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<TherapistListResponse | ErrorResponse>> {
  try {
    // Check authorization - patients, therapists, and admins can search
    const { authorized, profile } = await hasRole(['patient', 'therapist', 'admin']);
    
    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';

    const supabase = createSupabaseServerClient();

    let query = supabase
      .from('profiles')
      .select('id, full_name, first_name, email, avatar_url, created_at')
      .eq('role', 'therapist')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    // Apply search filter if provided
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,first_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching therapists:', error);
      return NextResponse.json(
        { error: 'Failed to fetch therapists' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { therapists: data || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/therapists:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

