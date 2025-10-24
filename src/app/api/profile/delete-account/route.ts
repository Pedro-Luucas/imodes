import { NextResponse } from 'next/server';
import { getUserFromCookie, clearAuthCookies } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { deleteFile, extractKeyFromUrl } from '@/lib/s3Client';
import type { DeleteAccountResponse, ErrorResponse } from '@/types/auth';

const BUCKET_NAME = 'avatar';

/**
 * DELETE /api/profile/delete-account
 * 
 * Deletes the authenticated user's account and all associated data
 * This includes:
 * - Profile avatar from S3 storage (handles missing files gracefully)
 * - Therapist record (if user is a therapist)
 *   Database CASCADE constraints automatically:
 *   - Set patients.therapist_id to NULL (preserve patient records)
 *   - Delete related imodes_session records
 *   - Delete related assignments
 * - Profile from profiles table (cascade deletes patient record if applicable)
 * - User from Supabase auth
 * - Session cookies
 * 
 * Requires valid session cookie
 */
export async function DELETE(): Promise<NextResponse<DeleteAccountResponse | ErrorResponse>> {
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

    // Create Supabase client
    const supabase = createSupabaseServerClient();

    // Step 1: Get current profile to check for avatar and role
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('avatar_url, role')
      .eq('id', user.id)
      .single();

    // Step 2: Delete avatar from S3 storage if exists
    if (currentProfile?.avatar_url) {
      try {
        const fileKey = extractKeyFromUrl(currentProfile.avatar_url);
        if (fileKey) {
          await deleteFile(BUCKET_NAME, fileKey);
        }
      } catch (error) {
        console.error('Error deleting avatar file:', error);
        // Continue even if avatar deletion fails - file might not exist
        // This handles cases where the file was already deleted or never existed
      }
    }

    // Step 3: Delete therapist record if user is a therapist
    // Database CASCADE constraints will automatically:
    // - Set patients.therapist_id to NULL (preserve patient records)
    // - Delete related imodes_session records
    // - Delete related assignments
    if (currentProfile?.role === 'therapist') {
      const { error: deleteTherapistError } = await supabase
        .from('therapists')
        .delete()
        .eq('id', user.id);

      if (deleteTherapistError) {
        console.error('Error deleting therapist record:', deleteTherapistError);
        return NextResponse.json(
          { error: 'Failed to delete therapist record' },
          { status: 500 }
        );
      }
    }

    // Step 4: Delete profile from database
    // This will cascade delete relationships (therapist-patient assignments, etc.)
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (deleteProfileError) {
      console.error('Error deleting profile:', deleteProfileError);
      return NextResponse.json(
        { error: 'Failed to delete profile' },
        { status: 500 }
      );
    }

    // Step 5: Delete user from Supabase auth
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteUserError) {
      console.error('Error deleting user from auth:', deleteUserError);
      // Profile is already deleted, but continue to clear cookies
    }

    // Step 6: Clear auth cookies
    await clearAuthCookies();

    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting account' },
      { status: 500 }
    );
  }
}
