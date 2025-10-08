import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabaseServerClient';
import { setAuthCookies } from '@/lib/auth';

/**
 * POST /api/login
 * 
 * Authenticates a user with email and password
 * Sets HttpOnly cookies with session tokens on success
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createSupabaseAnonClient();

    // Attempt to sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Handle authentication errors
    if (error || !data.session) {
      console.error('Login error:', error?.message);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Extract session tokens
    const { access_token, refresh_token } = data.session;
    const { user } = data;

    // Set secure HttpOnly cookies
    await setAuthCookies(access_token, refresh_token);

    // Return user information (excluding sensitive data)
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error during login:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
