import { NextRequest, NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import { uploadFile, deleteFile, getSignedUrl, extractKeyFromUrl } from '@/lib/s3Client';
import type { UploadAvatarResponse, DeleteAvatarResponse, ErrorResponse } from '@/types/auth';

const BUCKET_NAME = 'avatar';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * POST /api/profile/avatar
 * 
 * Uploads a profile avatar image
 * Requires valid session cookie
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadAvatarResponse | ErrorResponse>> {
  try {
    // Get authenticated user
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing session token' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const fileName = `${user.id}-${timestamp}.${extension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Get current profile to check for existing avatar
    const supabase = createSupabaseServerClient();
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    // Delete old avatar if exists
    if (currentProfile?.avatar_url) {
      try {
        // Extract file key from stored URL
        // Stored format is typically "avatar/filename.jpg"
        let oldKey: string | null = null;
        
        if (currentProfile.avatar_url.startsWith(`${BUCKET_NAME}/`)) {
          // Simple format: "avatar/filename.jpg"
          oldKey = currentProfile.avatar_url.replace(`${BUCKET_NAME}/`, '');
        } else {
          // Try to extract from full URL or other formats
          oldKey = extractKeyFromUrl(currentProfile.avatar_url);
        }
        
        if (oldKey) {
          await deleteFile(BUCKET_NAME, oldKey);
        }
      } catch (error) {
        console.error('Error deleting old avatar:', error);
        // Continue even if deletion fails - we don't want to block the upload
      }
    }

    // Upload new avatar
    await uploadFile(BUCKET_NAME, fileName, fileBuffer, file.type);

    // Update profile with new avatar URL
    const avatarUrl = `${BUCKET_NAME}/${fileName}`;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (updateError) {
      // If database update fails, try to delete the uploaded file
      try {
        await deleteFile(BUCKET_NAME, fileName);
      } catch {
        // Ignore cleanup errors
      }
      throw updateError;
    }

    // Generate signed URL for immediate display
    const signedUrl = await getSignedUrl(BUCKET_NAME, fileName, 86400); // 24 hours

    return NextResponse.json(
      {
        message: 'Avatar uploaded successfully',
        avatar_url: avatarUrl,
        signed_url: signedUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while uploading avatar' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile/avatar
 * 
 * Deletes the user's profile avatar
 * Requires valid session cookie
 */
export async function DELETE(): Promise<NextResponse<DeleteAvatarResponse | ErrorResponse>> {
  try {
    // Get authenticated user
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing session token' },
        { status: 401 }
      );
    }

    // Get current profile
    const supabase = createSupabaseServerClient();
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    if (!currentProfile?.avatar_url) {
      return NextResponse.json(
        { error: 'No avatar to delete' },
        { status: 404 }
      );
    }

    // Delete file from storage
    // Extract file key from stored URL (format: "avatar/filename.jpg")
    let fileKey: string | null = null;
    
    if (currentProfile.avatar_url.startsWith(`${BUCKET_NAME}/`)) {
      // Simple format: "avatar/filename.jpg"
      fileKey = currentProfile.avatar_url.replace(`${BUCKET_NAME}/`, '');
    } else {
      // Try to extract from full URL or other formats
      fileKey = extractKeyFromUrl(currentProfile.avatar_url);
    }
    
    if (fileKey) {
      try {
        await deleteFile(BUCKET_NAME, fileKey);
      } catch (error) {
        console.error('Error deleting avatar file:', error);
        // Continue to update database even if file deletion fails
      }
    }

    // Update profile to remove avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(
      { message: 'Avatar deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting avatar' },
      { status: 500 }
    );
  }
}

