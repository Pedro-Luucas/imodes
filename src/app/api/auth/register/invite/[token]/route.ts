import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { getUserProfile } from '@/lib/roleAuth';
import type {
  InviteValidationResponse,
  ErrorResponse,
} from '@/types/auth';

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<InviteValidationResponse | ErrorResponse>> {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json(
        { error: 'Invite token is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const { data: invite, error } = await supabase
      .from('patient_invites')
      .select('id, token, therapist_id, created_at, expires_at, consumed_at')
      .eq('token', token)
      .single();

    if (error || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.consumed_at) {
      return NextResponse.json(
        { error: 'Invite has already been used' },
        { status: 410 }
      );
    }

    const expiresAt = invite.expires_at ? new Date(invite.expires_at) : null;
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Invite has expired' },
        { status: 410 }
      );
    }

    const therapist = await getUserProfile(invite.therapist_id);
    if (!therapist || therapist.role !== 'therapist') {
      return NextResponse.json(
        { error: 'Therapist no longer available' },
        { status: 410 }
      );
    }

    return NextResponse.json(
      {
        invite,
        therapist: {
          id: therapist.id,
          full_name: therapist.full_name,
          first_name: therapist.first_name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/auth/register/invite/[token]:', error);
    return NextResponse.json(
      { error: 'Unexpected error validating invite' },
      { status: 500 }
    );
  }
}


