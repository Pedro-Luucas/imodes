import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { getSignedUrl } from '@/lib/s3Client';
import type { ErrorResponse } from '@/types/auth';

const BUCKET_NAME = 'avatar';

interface AvatarUrlResponse {
  signed_url: string | null;
  avatar_url: string | null;
}

/**
 * GET /api/profile/avatar/url
 * 
 * Gets a signed URL for the authenticated user's avatar
 * Returns null if no avatar exists
 * Requires valid session cookie
 */
export async function GET(): Promise<NextResponse<AvatarUrlResponse | ErrorResponse>> {
  try {
    // Get authenticated user
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing session token' },
        { status: 401 }
      );
    }

    // Get current profile
    const supabase = createSupabaseServerClient();
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (!currentProfile?.avatar_url) {
      return NextResponse.json(
        {
          signed_url: null,
          avatar_url: null,
        },
        { status: 200 }
      );
    }

    // Extract file key from stored URL
    const fileKey = currentProfile.avatar_url.replace(`${BUCKET_NAME}/`, '');

    // Generate signed URL
    const signedUrl = await getSignedUrl(BUCKET_NAME, fileKey, 86400); // 24 hours

    return NextResponse.json(
      {
        signed_url: signedUrl,
        avatar_url: currentProfile.avatar_url,
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

