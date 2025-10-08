import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabaseServerClient';
import { setAuthCookies } from '@/lib/auth';

/**
 * POST /api/register
 * 
 * Registers a new user with email and password
 * Sets HttpOnly cookies with session tokens on success
 */

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password, userData } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createSupabaseAnonClient();

    // Attempt to sign up with email and password
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {}, // Optional user metadata
      },
    });

    // Handle registration errors
    if (error) {
      console.error('Registration error:', error.message);
      
      // Check for specific error types
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || 'Registration failed' },
        { status: 400 }
      );
    }

    // Check if user was created
    if (!data.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    const { user, session } = data;

    // Some Supabase configurations require email confirmation
    // In that case, session will be null until email is confirmed
    if (session) {
      // Extract session tokens
      const { access_token, refresh_token } = session;

      // Set secure HttpOnly cookies
      await setAuthCookies(access_token, refresh_token);

      // Return user information with session
      return NextResponse.json(
        {
          user: {
            id: user.id,
            email: user.email,
            email_confirmed_at: user.email_confirmed_at,
            created_at: user.created_at,
          },
          message: 'Registration successful',
          requiresEmailConfirmation: false,
        },
        { status: 201 }
      );
    } else {
      // Email confirmation required
      return NextResponse.json(
        {
          user: {
            id: user.id,
            email: user.email,
            email_confirmed_at: user.email_confirmed_at,
            created_at: user.created_at,
          },
          message: 'Registration successful. Please check your email to confirm your account.',
          requiresEmailConfirmation: true,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Unexpected error during registration:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
