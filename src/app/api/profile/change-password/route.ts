import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { changePasswordSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import type { ChangePasswordResponse, ErrorResponse } from '@/types/auth';

/**
 * POST /api/profile/change-password
 * 
 * Changes the authenticated user's password
 * Requires valid session cookie and current password
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ChangePasswordResponse | ErrorResponse>> {
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

    // Parse request body
    const body = await request.json();

    // Validate input with Zod
    const validatedData = changePasswordSchema.parse(body);
    const { currentPassword, newPassword } = validatedData;

    // Create Supabase client
    const supabase = createSupabaseServerClient();

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email || '',
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error('Password update error:', updateError.message);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Password changed successfully' },
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
        } as ErrorResponse & { details: Array<{ field: string; message: string }> },
        { status: 400 }
      );
    }

    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

