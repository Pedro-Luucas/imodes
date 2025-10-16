import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearAuthCookies, COOKIE_NAME } from '@/lib/auth';
import { createSupabaseAnonClient } from '@/lib/supabaseServerClient';

/**
 * POST /api/auth/logout
 * 
 * Logs out the user by:
 * 1. Signing out from Supabase (invalidates the session)
 * 2. Clearing authentication cookies
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(COOKIE_NAME)?.value;

    // Sign out from Supabase if we have a token
    if (accessToken) {
      const supabase = createSupabaseAnonClient();
      await supabase.auth.signOut();
    }

    // Clear authentication cookies
    await clearAuthCookies();

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error during logout:', error);
    
    // Even if there's an error, clear cookies to ensure logout
    try {
      await clearAuthCookies();
    } catch (clearError) {
      console.error('Error clearing cookies:', clearError);
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
