import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';

/**
 * POST /api/logout
 * 
 * Logs out the user by clearing authentication cookies
 */
export async function POST() {
  try {
    // Clear authentication cookies
    await clearAuthCookies();

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
