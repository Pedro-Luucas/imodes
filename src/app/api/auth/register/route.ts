import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabaseServerClient';
import { registerSchema } from '@/lib/validations';
import { ZodError } from 'zod';

/**
 * POST /api/register
 * 
 * Registration flow with email confirmation:
 * 1. Create user in Supabase Auth with metadata (role, full_name, first_name, phone, email)
 * 2. User receives confirmation email
 * 3. User clicks confirmation link to verify email
 * 4. Database trigger automatically creates profile and role-specific records
 * 5. User can then sign in with full profile access
 * 
 * Note: Profile creation is handled by database trigger in supabase_migration_email_confirmation_trigger.sql
 */

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input with Zod
    const validatedData = registerSchema.parse(body);
    const { email, password, role, full_name, first_name, phone } = validatedData;

    // Initialize Supabase client
    const supabase = createSupabaseAnonClient();

    // Check if email already exists in profiles table using database function
    const { data: emailExists, error: profileCheckError } = await supabase
      .rpc('check_email_exists', { email_to_check: email });

    // Handle database query errors
    if (profileCheckError) {
      console.error('Error checking profile existence:', profileCheckError.message);
      return NextResponse.json(
        { error: 'Failed to verify email availability' },
        { status: 500 }
      );
    }

    // If email exists, return error
    if (emailExists === true) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Step 1: Create user in auth with metadata
    // Metadata will be used by database trigger to create profile after email confirmation
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name,
          first_name,
          phone: phone || null,
          email,
        },
      },
    });

    // Handle registration errors
    if (signUpError) {
      console.error('Registration error:', signUpError.message);
      
      // Check for specific error types
      if (signUpError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: signUpError.message || 'Registration failed' },
        { status: 400 }
      );
    }

    // Check if user was created
    if (!signUpData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    const { user } = signUpData;

    // Step 2: Return success response
    // Profile and role-specific records will be created automatically by database trigger
    // when the user confirms their email
    return NextResponse.json(
      { 
        user: {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
        },
        message: 'Registration successful! Please check your email to confirm your account. Your profile will be created automatically once you verify your email address.',
        requiresEmailConfirmation: true,
      },
      { status: 201 }
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

    console.error('Unexpected error during registration:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
