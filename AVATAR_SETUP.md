# Avatar Upload Setup Guide

This guide explains how to configure and use the profile avatar upload feature.

## Prerequisites

1. A Supabase project with Storage enabled
2. An "avatar" bucket created in Supabase Storage (set as **private**)
3. S3 access credentials from Supabase

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# AWS S3 Configuration (for Supabase Storage)
ACCESS_KEY_ID=your_access_key_id_here
SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_REGION=us-east-1  # Optional, defaults to us-east-1
```

### Getting S3 Access Keys from Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Storage** > **Settings** > **S3 Access Keys**
3. Generate new access keys if you haven't already
4. Copy the `ACCESS_KEY_ID` and `SECRET_ACCESS_KEY`

## Database Schema

The `profiles` table should have an `avatar_url` column:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

The column should already exist if you're using the `Profile` type definition from `src/types/auth.ts`.

## Bucket Configuration

1. Create a bucket named `avatar` in your Supabase Storage
2. Set the bucket to **private** (requires authentication to access)
3. Set up Row Level Security (RLS) policies if needed:

```sql
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatar' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatar' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatar' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to view any avatar (for profile display)
CREATE POLICY "Users can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatar');
```

## Features

### Upload Avatar
- Maximum file size: 5MB
- Supported formats: JPG, JPEG, PNG, GIF, WebP
- Automatic deletion of old avatar when uploading a new one
- File naming convention: `{userId}-{timestamp}.{extension}`

### Delete Avatar
- Removes avatar from storage bucket
- Sets `avatar_url` to `null` in the database

### Signed URLs
- Generated with 24-hour expiration
- Automatically refreshed when profile is loaded
- Required because the bucket is private

## API Endpoints

### POST /api/profile/avatar
Upload a new avatar image.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: FormData with `avatar` field containing the image file
- Authentication: Required (cookie-based)

**Response:**
```json
{
  "message": "Avatar uploaded successfully",
  "avatar_url": "avatar/user-id-timestamp.jpg",
  "signed_url": "https://...signed-url..."
}
```

### DELETE /api/profile/avatar
Delete the user's avatar.

**Request:**
- Method: `DELETE`
- Authentication: Required (cookie-based)

**Response:**
```json
{
  "message": "Avatar deleted successfully"
}
```

### GET /api/profile/avatar/url
Get a signed URL for the current user's avatar.

**Request:**
- Method: `GET`
- Authentication: Required (cookie-based)

**Response:**
```json
{
  "signed_url": "https://...signed-url...",
  "avatar_url": "avatar/user-id-timestamp.jpg"
}
```

## Client-Side Usage

### Import Functions
```typescript
import { uploadAvatar, deleteAvatar } from '@/lib/authClient';
```

### Upload Avatar
```typescript
const handleFileSelect = async (file: File) => {
  try {
    const response = await uploadAvatar(file);
    console.log('Avatar uploaded:', response.signed_url);
    // Refresh profile data to show new avatar
    await refetch();
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Delete Avatar
```typescript
const handleDelete = async () => {
  try {
    await deleteAvatar();
    console.log('Avatar deleted');
    // Refresh profile data
    await refetch();
  } catch (error) {
    console.error('Delete failed:', error);
  }
};
```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── profile/
│   │       └── avatar/
│   │           ├── route.ts          # Upload & delete endpoints
│   │           └── url/
│   │               └── route.ts      # Get signed URL endpoint
│   └── [locale]/
│       └── profile/
│           └── page.tsx              # Profile page with avatar UI
├── lib/
│   ├── authClient.ts                 # Client-side functions
│   └── s3Client.ts                   # S3 client utilities
└── types/
    └── auth.ts                       # TypeScript definitions
```

## Troubleshooting

### "Missing S3 credentials" error
Make sure `ACCESS_KEY_ID` and `SECRET_ACCESS_KEY` are set in your `.env.local` file.

### "Failed to upload avatar" error
1. Check that the "avatar" bucket exists in Supabase Storage
2. Verify the bucket is set to private
3. Ensure your S3 credentials are correct
4. Check file size (must be < 5MB) and format (JPG/PNG/GIF/WebP)

### Avatar not displaying
1. Signed URLs expire after 24 hours - reload the page to get a fresh URL
2. Check browser console for errors
3. Verify the `profiles` table has the `avatar_url` column

### Permission denied errors
Check your Supabase Storage RLS policies and ensure authenticated users have proper permissions.

