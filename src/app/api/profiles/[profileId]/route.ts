'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { hasRole } from '@/lib/roleAuth';
import type { Profile } from '@/types/auth';

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

type ErrorResponse = {
  error: string;
};

type GetProfileResponse = {
  profile: Profile;
};

const PROFILE_SELECT =
  'id,role,full_name,first_name,email,phone,avatar_url,is_active,subscription_active,settings,created_at,updated_at' as const;

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<GetProfileResponse | ErrorResponse>> {
  try {
    const { profileId } = await context.params;

    const { authorized } = await hasRole(['therapist', 'patient', 'admin']);

    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', profileId)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    let therapistId: string | null = null;

    if (profile.role === 'patient') {
      const { data: patientRecord } = await supabase
        .from('patients')
        .select('therapist_id')
        .eq('id', profileId)
        .single();

      therapistId = patientRecord?.therapist_id ?? null;
    }

    const sanitizedProfile: Profile = {
      ...(profile as Profile),
      therapist_id: therapistId,
    };

    return NextResponse.json(
      { profile: sanitizedProfile },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/profiles/[profileId]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


