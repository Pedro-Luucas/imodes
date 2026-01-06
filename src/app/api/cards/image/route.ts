import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrl } from '@/lib/s3Client';
import { hasRole } from '@/lib/roleAuth';

const BUCKET_NAME = 'modes_cards';

/**
 * GET /api/cards/image
 *
 * Generates a short-lived signed URL for a card image.
 * This endpoint is only required when the storage bucket remains private.
 * If `modes_cards` is public, prefer the deterministic `publicUrl`
 * returned by `/api/cards/list` and skip this route entirely.
 *
 * Query params: path (file path in bucket)
 * Returns: { signed_url }
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<{ signed_url: string } | { error: string }>> {
  try {
    // Cards image API is public - no authentication required
    // This allows demo sessions and regular sessions to access card images

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }

    // Generate signed URL (24 hours expiration)
    const signedUrl = await getSignedUrl(BUCKET_NAME, path, 86400);

    return NextResponse.json({ signed_url: signedUrl }, { status: 200 });
  } catch (error) {
    console.error('Error getting card image URL:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching image URL' },
      { status: 500 }
    );
  }
}

