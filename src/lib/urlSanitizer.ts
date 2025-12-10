'use client';

/**
 * Utility to sanitize Supabase storage URLs
 * Converts signed S3 URLs (which expire) to public URLs (which don't expire)
 * 
 * Signed URL format:  https://xxx.supabase.co/storage/v1/s3/bucket/path?X-Amz-...
 * Public URL format:  https://xxx.supabase.co/storage/v1/object/public/bucket/path
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

/**
 * Check if a URL is a Supabase storage URL
 */
function isSupabaseStorageUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('.supabase.co/storage/') || url.includes('supabase.co/storage/');
}

/**
 * Check if a URL is a signed S3 URL (has expiration)
 */
function isSignedUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('/storage/v1/s3/') || url.includes('X-Amz-');
}

/**
 * Extract the bucket and path from a Supabase storage URL
 * Works with both signed (/s3/) and public (/object/public/) URLs
 */
function extractBucketAndPath(url: string): { bucket: string; path: string } | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Match /storage/v1/s3/{bucket}/{path}
    const s3Match = pathname.match(/\/storage\/v1\/s3\/([^/]+)\/(.+)/);
    if (s3Match) {
      return { bucket: s3Match[1], path: s3Match[2] };
    }
    
    // Match /storage/v1/object/public/{bucket}/{path}
    const publicMatch = pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (publicMatch) {
      return { bucket: publicMatch[1], path: publicMatch[2] };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Build a public URL from bucket and path
 */
function buildPublicUrl(baseUrl: string, bucket: string, path: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Sanitize a Supabase storage URL to ensure it's a public (non-expiring) URL
 * If the URL is already public or not a Supabase URL, returns it unchanged
 */
export function sanitizeStorageUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  
  // If not a Supabase storage URL, return as-is
  if (!isSupabaseStorageUrl(url)) {
    return url;
  }
  
  // If already a public URL (not signed), return as-is
  if (!isSignedUrl(url)) {
    return url;
  }
  
  // Extract bucket and path from the signed URL
  const extracted = extractBucketAndPath(url);
  if (!extracted) {
    // Couldn't parse, return original
    return url;
  }
  
  // Get base URL from the original URL or use env
  let baseUrl = SUPABASE_URL;
  try {
    const urlObj = new URL(url);
    baseUrl = `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    // Use env URL as fallback
  }
  
  if (!baseUrl) {
    return url;
  }
  
  // Build and return public URL
  return buildPublicUrl(baseUrl, extracted.bucket, extracted.path);
}

/**
 * Sanitize a card object's imageUrl
 * Returns a new object with sanitized URL
 */
export function sanitizeCardImageUrl<T extends { imageUrl?: string }>(card: T): T {
  if (!card.imageUrl) return card;
  
  const sanitizedUrl = sanitizeStorageUrl(card.imageUrl);
  if (sanitizedUrl === card.imageUrl) return card;
  
  return { ...card, imageUrl: sanitizedUrl };
}

