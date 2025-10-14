import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabaseServerClient';
import { resetPasswordSchema } from '@/lib/validations';
import { ZodError } from 'zod';

/**
 * POST /api/reset-password
 * 
 * Resets the user's password using the access token from the reset email
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input with Zod
    const validatedData = resetPasswordSchema.parse(body);
    const { password, accessToken, refreshToken } = validatedData;

    // Initialize Supabase client
    const supabase = createSupabaseAnonClient();

    // Set the session using the tokens from the password reset email
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      console.error('Session error:', sessionError.message);
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new password reset.' },
        { status: 400 }
      );
    }

    // Update the user's password
    const { data, error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      console.error('Password update error:', updateError.message);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 400 }
      );
    }

    // Sign out after password reset
    await supabase.auth.signOut();

    return NextResponse.json(
      { message: 'Password successfully reset. Please log in with your new password.' },
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

    console.error('Unexpected error during password reset:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

