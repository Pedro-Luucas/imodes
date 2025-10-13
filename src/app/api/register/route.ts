import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabaseServerClient';
import { setAuthCookies } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { ZodError } from 'zod';

/**
 * POST /api/register
 * 
 * Registration flow:
 * 1. Create user in Supabase Auth
 * 2. Authenticate the user (sign in)
 * 3. Create profile record (with authenticated session)
 * 4. Create role-specific record (therapist or patient)
 * 5. Set HttpOnly cookies with session tokens
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

    // Step 1: Create user in auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
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

    // Step 2: Authenticate the user (sign in)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      console.error('Authentication error after signup:', signInError?.message);
      
      return NextResponse.json(
        { 
          user: {
            id: user.id,
            email: user.email,
            email_confirmed_at: user.email_confirmed_at,
            created_at: user.created_at,
          },
          message: 'Account created. Please check your email to confirm your account before creating your profile.',
          requiresEmailConfirmation: true,
        },
        { status: 201 }
      );
    }

    const { session } = signInData;

    // Step 3: Create profile record (with authenticated session)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        role: role,
        full_name: full_name,
        first_name: first_name,
        email: email,
        avatar_url: null,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError.message);
      
      // Sign out the user since profile creation failed
      await supabase.auth.signOut();
      
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Step 4: Create role-specific record (with authenticated session)
    if (role === 'therapist') {
      const { error: therapistError } = await supabase
        .from('therapists')
        .insert({
          id: user.id,
          patients: [],
          phone: phone || null,
        });

      if (therapistError) {
        console.error('Therapist record creation error:', therapistError.message);
        
        // Clean up profile and sign out
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.auth.signOut();
        
        return NextResponse.json(
          { error: 'Failed to create therapist record' },
          { status: 500 }
        );
      }
    } else if (role === 'patient') {
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          id: user.id,
          therapist_id: null,
        });

      if (patientError) {
        console.error('Patient record creation error:', patientError.message);
        
        // Clean up profile and sign out
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.auth.signOut();
        
        return NextResponse.json(
          { error: 'Failed to create patient record' },
          { status: 500 }
        );
      }
    }

    // Step 5: Set secure HttpOnly cookies
    const { access_token, refresh_token } = session;
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
        profile: {
          id: profileData.id,
          role: profileData.role,
          full_name: profileData.full_name,
          first_name: profileData.first_name,
          email: profileData.email,
        },
        message: 'Registration successful',
        requiresEmailConfirmation: false,
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
