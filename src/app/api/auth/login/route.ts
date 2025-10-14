import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabaseServerClient';
import { setAuthCookies } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { ZodError } from 'zod';

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

    // Validate input with Zod
    const validatedData = loginSchema.parse(body);
    const { email, password } = validatedData;

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
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Unexpected error during login:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
