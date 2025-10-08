'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, logout as logoutApi } from '@/lib/authClient';
import type { ProfileResponse } from '@/types/auth';

interface UseAuthOptions {
  /**
   * If true, redirects to /login when user is not authenticated
   * @default true
   */
  requireAuth?: boolean;
  
  /**
   * Custom redirect path when not authenticated
   * @default '/login'
   */
  redirectTo?: string;
}

interface UseAuthReturn {
  /**
   * The authenticated user's profile data
   */
  user: ProfileResponse['user'] | null;
  
  /**
   * True while checking authentication status
   */
  loading: boolean;
  
  /**
   * True if user is authenticated
   */
  isAuthenticated: boolean;
  
  /**
   * Logout function that clears session and redirects
   */
  logout: () => Promise<void>;
  
  /**
   * Manually refresh user data
   */
  refetch: () => Promise<void>;
}

/**
 * Hook for managing authentication state
 * 
 * @example
 * ```tsx
 * // Require authentication (redirects to login if not authenticated)
 * const { user, loading, logout } = useAuth();
 * 
 * // Optional authentication (doesn't redirect)
 * const { user, isAuthenticated } = useAuth({ requireAuth: false });
 * 
 * // Custom redirect
 * const { user } = useAuth({ redirectTo: '/signin' });
 * ```
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { requireAuth = true, redirectTo = '/login' } = options;
  const router = useRouter();
  
  const [user, setUser] = useState<ProfileResponse['user'] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const profile = await getProfile();
      setUser(profile.user);
    } catch {
      setUser(null);
      if (requireAuth) {
        router.push(redirectTo);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try {
      await logoutApi();
      setUser(null);
      router.push(redirectTo);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const refetch = async () => {
    setLoading(true);
    await fetchUser();
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout,
    refetch,
  };
}
