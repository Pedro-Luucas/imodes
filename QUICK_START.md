# Avatar Upload - Quick Start

## 🚀 Setup (5 minutes)

### 1. Install Dependencies ✅
Already installed: `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`

### 2. Add Environment Variables
Add these to your `.env.local` file:

```env
ACCESS_KEY_ID=your_supabase_s3_access_key_here
SECRET_ACCESS_KEY=your_supabase_s3_secret_key_here
```

**Where to get these:**
- Go to Supabase Dashboard → Storage → Settings → S3 Access Keys
- Generate new keys and copy them

### 3. Verify Database
Your `profiles` table should already have the `avatar_url` column (it's in your Profile type).

If not, run:
```sql
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
```

### 4. Verify Bucket
Make sure you have an "avatar" bucket in Supabase Storage set to **private**.

## ✅ What's Been Implemented

### Backend
- ✅ `/api/profile/avatar` - POST to upload, DELETE to remove
- ✅ `/api/profile/avatar/url` - GET signed URL
- ✅ S3 client with upload, delete, and signed URL generation
- ✅ File validation (5MB max, jpg/png/gif/webp only)
- ✅ Automatic old avatar cleanup

### Frontend  
- ✅ Profile page with avatar upload UI
- ✅ Click avatar to upload
- ✅ File validation with error messages
- ✅ Loading states
- ✅ Delete button
- ✅ Automatic signed URL fetching

## 🎯 How to Use

### As a User
1. Go to `/profile` page
2. Click on your avatar circle
3. Select an image file (< 5MB, jpg/png/gif/webp)
4. Wait for upload (loading spinner shows)
5. Your avatar appears automatically!
6. Click "Remove avatar" to delete

### As a Developer
```typescript
import { uploadAvatar, deleteAvatar } from '@/lib/authClient';

// Upload
const file = ...; // File from input
const result = await uploadAvatar(file);
console.log(result.signed_url); // Use this URL to display

// Delete
await deleteAvatar();
```

## 🧪 Test It

1. Start your dev server: `npm run dev`
2. Log in to your app
3. Go to profile page
4. Click avatar and upload an image
5. See it display immediately!

## 📚 Full Documentation

- **AVATAR_SETUP.md** - Complete setup guide with RLS policies
- **AVATAR_IMPLEMENTATION_SUMMARY.md** - Technical details and architecture

## ⚡ Key Points

- **Private bucket** - Avatars require authentication
- **Signed URLs** - Auto-expire after 24 hours
- **Auto cleanup** - Old avatars deleted on new upload
- **Secure** - Users can only manage their own avatars
- **Validated** - Size and type checked before upload

That's it! You're ready to go! 🎉

