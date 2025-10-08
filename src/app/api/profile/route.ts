import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';

/**
 * GET /api/profile
 * 
 * Protected route that returns the authenticated user's profile
 * Requires valid session cookie
 */
export async function GET() {
  try {
    // Get user from cookie
    const user = await getUserFromCookie();

    // Check if user is authenticated
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing session token' },
        { status: 401 }
      );
    }

    // Return user data
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          phone: user.phone,
          created_at: user.created_at,
          updated_at: user.updated_at,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
