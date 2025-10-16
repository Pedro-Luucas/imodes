import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

/**
 * GET /api/profile
 * 
 * Protected route that returns the authenticated user's profile from public.profiles
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

    // Get user ID
    const userId = user.id;

    // Create Supabase client
    const supabase = createSupabaseServerClient();

    // Query public.profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile from database:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile from database' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Return profile data
    return NextResponse.json(
      { profile },
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
