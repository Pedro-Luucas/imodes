'use client';

/**
 * Sanitizes Supabase storage URLs to ensure they use the public URL format.
 * This converts signed URLs (which expire) to public URLs (which don't expire).
 * 
 * Supabase storage URL formats:
 * - Public: https://project.supabase.co/storage/v1/object/public/bucket/path
 * - Signed: https://project.supabase.co/storage/v1/object/sign/bucket/path?token=...
 * 
 * @param url - The URL to sanitize (can be undefined)
 * @returns The sanitized public URL, or undefined if input is undefined/invalid
 */
export function sanitizeStorageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    const urlObj = new URL(url);
    
    // Remove query parameters (like signed tokens)
    urlObj.search = '';
    
    // Convert signed URLs to public URLs
    // Replace /object/sign/ with /object/public/
    const pathname = urlObj.pathname.replace('/object/sign/', '/object/public/');
    urlObj.pathname = pathname;
    
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return the original URL
    // This handles cases where the URL might be a relative path or invalid
    return url;
  }
}


