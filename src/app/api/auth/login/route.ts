import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabaseServerClient';
import { setAuthCookies } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { getApiMessages } from '@/lib/apiMessages';
import { mapZodErrorsToTranslated, isEmailNotVerifiedError } from '@/lib/validationMessages';

/**
 * POST /api/login
 * 
 * Authenticates a user with email and password
 * Sets HttpOnly cookies with session tokens on success
 */
export async function POST(request: NextRequest) {
  // Get locale from cookie first, then from body
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  let messages = await getApiMessages(cookieLocale);
  
  try {
    // Parse request body
    const body = await request.json();
    const locale = typeof body?.locale === 'string' ? body.locale : cookieLocale;
    messages = await getApiMessages(locale);

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
      
      // Check for specific error types
      if (error && isEmailNotVerifiedError(error.message)) {
        return NextResponse.json(
          { error: messages.auth.login.emailNotVerified },
          { status: 401 }
        );
      }
      
      // Check if the email exists to provide a more specific error
      const { data: emailExists } = await supabase
        .rpc('check_email_exists', { email_to_check: email });
      
      if (emailExists === false) {
        // Account doesn't exist
        return NextResponse.json(
          { error: messages.auth.login.accountNotFound },
          { status: 401 }
        );
      }
      
      // Account exists but password is wrong
      return NextResponse.json(
        { error: messages.auth.login.wrongPassword },
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
          error: messages.common.validationFailed,
          details: mapZodErrorsToTranslated(error.issues, messages),
        },
        { status: 400 }
      );
    }

    console.error('Unexpected error during login:', error);
    return NextResponse.json(
      { error: messages.common.unexpectedError },
      { status: 500 }
    );
  }
}
