import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabaseServerClient';
import { resetPasswordSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { getApiMessages } from '@/lib/apiMessages';

/**
 * POST /api/reset-password
 * 
 * Resets the user's password using the access token from the reset email
 */
export async function POST(request: NextRequest) {
  let messages = await getApiMessages();
  let resetMessages = messages.auth.resetPassword;
  try {
    // Parse request body
    const body = await request.json();
    const locale = typeof body?.locale === 'string' ? body.locale : undefined;
    messages = await getApiMessages(locale);
    resetMessages = messages.auth.resetPassword;

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
        { error: resetMessages.invalidLink },
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
        { error: resetMessages.updateFailed },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: resetMessages.updateFailed },
        { status: 400 }
      );
    }

    // Sign out after password reset
    await supabase.auth.signOut();

    return NextResponse.json(
      { message: resetMessages.success },
      { status: 200 }
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: messages.common.validationFailed,
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
      { error: messages.common.unexpectedError },
      { status: 500 }
    );
  }
}

