import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { hasRole } from '@/lib/roleAuth';
import type {
  CreateInviteRequest,
  CreateInviteResponse,
  ErrorResponse,
} from '@/types/auth';
import { routing } from '@/i18n/routing';

type RouteContext = {
  params: Promise<{ therapistId: string }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<CreateInviteResponse | ErrorResponse>> {
  try {
    const { therapistId } = await context.params;
    const { authorized, profile } = await hasRole(['therapist', 'admin']);

    if (!authorized || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const isAdmin = profile.role === 'admin';
    if (!isAdmin && profile.id !== therapistId) {
      return NextResponse.json(
        { error: 'You can only create invites for your own profile' },
        { status: 403 }
      );
    }

    let body: CreateInviteRequest = {};
    try {
      body = await request.json();
    } catch {
      // ignore empty body
    }

    let expiresAtISO: string | undefined;
    const expiresInHours = Number(body?.expiresInHours);
    if (Number.isFinite(expiresInHours) && expiresInHours > 0) {
      const hours = Math.max(1, Math.min(expiresInHours, 24 * 30));
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      expiresAtISO = expiresAt.toISOString();
    }

    const supabase = createSupabaseServerClient();
    const insertPayload = {
      therapist_id: therapistId,
      ...(expiresAtISO ? { expires_at: expiresAtISO } : {}),
    };

    const { data: invite, error } = await supabase
      .from('patient_invites')
      .insert(insertPayload)
      .select('id, token, therapist_id, created_at, expires_at, consumed_at')
      .single();

    if (error || !invite) {
      console.error('Error creating patient invite:', error);
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      );
    }
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const locale = routing.locales.includes(cookieLocale as typeof routing.locales[number])
      ? (cookieLocale as typeof routing.locales[number])
      : routing.defaultLocale;
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://imodes.vercel.app';
    const inviteUrl = `${appBaseUrl}/${locale}/auth/register/patient?token=${invite.token}`;

    return NextResponse.json(
      {
        invite,
        url: inviteUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/therapists/[therapistId]/invites:', error);
    return NextResponse.json(
      { error: 'Unexpected error creating invite' },
      { status: 500 }
    );
  }
}

