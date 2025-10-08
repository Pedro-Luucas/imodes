import { cookies } from 'next/headers';
import { createSupabaseServerClient } from './supabaseServerClient';
import type { User } from '@supabase/supabase-js';

export const COOKIE_NAME = 'sb-access-token';
export const REFRESH_COOKIE_NAME = 'sb-refresh-token';

/**
 * Cookie configuration
 */
export function getCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAge ?? 60 * 60 * 24 * 7, // 7 days default
  };
}

/**
 * Gets the authenticated user from the cookie
 * Returns null if not authenticated or token is invalid
 */
export async function getUserFromCookie(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(COOKIE_NAME)?.value;

    if (!accessToken) {
      return null;
    }

    const supabase = createSupabaseServerClient();
    
    // Verify the token and get user
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error getting user from cookie:', error);
    return null;
  }
}

/**
 * Sets authentication cookies
 */
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, accessToken, getCookieOptions());
  cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());
}

/**
 * Clears authentication cookies
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, '', { ...getCookieOptions(), maxAge: 0 });
  cookieStore.set(REFRESH_COOKIE_NAME, '', { ...getCookieOptions(), maxAge: 0 });
}
