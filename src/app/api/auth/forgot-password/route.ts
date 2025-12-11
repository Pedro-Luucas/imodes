import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabaseServerClient';
import { forgotPasswordSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { getApiMessages } from '@/lib/apiMessages';
import { mapZodErrorsToTranslated } from '@/lib/validationMessages';

/**
 * POST /api/forgot-password
 * 
 * Sends a password reset email to the user
 * Always returns success (security best practice to prevent email enumeration)
 */
export async function POST(request: NextRequest) {
  // Get locale from cookie first, then from body
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  let messages = await getApiMessages(cookieLocale);
  
  try {
    // Parse request body
    const body = await request.json();
    const locale = typeof body?.locale === 'string' ? body.locale : cookieLocale || 'en';
    messages = await getApiMessages(locale);

    // Validate input with Zod
    const validatedData = forgotPasswordSchema.parse(body);
    const { email } = validatedData;

    // Initialize Supabase client
    const supabase = createSupabaseAnonClient();

    // Get the redirect URL for the password reset
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${locale}/auth/reset-password`;

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    // Log error but don't expose it to the client (security best practice)
    if (error) {
      console.error('Password reset error:', error.message);
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json(
      { message: messages.auth.forgotPassword.success },
      { status: 200 }
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: messages.common.validationFailed,
          details: mapZodErrorsToTranslated(error.issues, messages),
        },
        { status: 400 }
      );
    }

    console.error('Unexpected error during password reset request:', error);
    return NextResponse.json(
      { error: messages.common.unexpectedError },
      { status: 500 }
    );
  }
}

