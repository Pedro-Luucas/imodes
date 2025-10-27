import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { getSignedUrl } from '@/lib/s3Client';
import { hasRole } from '@/lib/roleAuth';
import type { ErrorResponse } from '@/types/auth';

const BUCKET_NAME = 'avatar';

interface AvatarUrlResponse {
  signed_url: string | null;
  avatar_url: string | null;
}

type RouteContext = {
  params: Promise<{ userId: string }>;
};

/**
 * GET /api/profile/avatar/url/[userId]
 * 
 * Gets a signed URL for a user's avatar
 * Returns null if no avatar exists
 * Requires authentication
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<AvatarUrlResponse | ErrorResponse>> {
  try {
    const { userId } = await context.params;

    // Check authorization - any authenticated user can access this
    const { authorized } = await hasRole(['therapist', 'patient', 'admin']);
    
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing session token' },
        { status: 401 }
      );
    }

    // Get the user's profile
    const supabase = createSupabaseServerClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    if (!profile?.avatar_url) {
      return NextResponse.json(
        {
          signed_url: null,
          avatar_url: null,
        },
        { status: 200 }
      );
    }

    // Extract file key from stored URL
    // The stored URL format is "avatar/filename.jpg"
    const fileKey = profile.avatar_url.replace(`${BUCKET_NAME}/`, '');

    // Generate signed URL
    const signedUrl = await getSignedUrl(BUCKET_NAME, fileKey, 86400); // 24 hours

    return NextResponse.json(
      {
        signed_url: signedUrl,
        avatar_url: profile.avatar_url,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting avatar URL:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching avatar URL' },
      { status: 500 }
    );
  }
}

