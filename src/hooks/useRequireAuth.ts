'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useIsAuthenticated, useAuthLoading } from '@/stores/authStore';

interface UseRequireAuthOptions {
  /**
   * Custom redirect path when not authenticated
   * @default '/login'
   */
  redirectTo?: string;
}

/**
 * Minimal hook that redirects to login if user is not authenticated.
 * Use this on protected pages that require authentication.
 * 
 * For accessing auth data, use the store hooks directly:
 * - useAuthProfile() - get user profile data
 * - useAuthLoading() - get loading state
 * - useIsAuthenticated() - check auth status
 * - useAuthActions() - get actions (login, logout, refetch, etc.)
 * 
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   useRequireAuth(); // Redirects if not authenticated
 *   
 *   const profile = useAuthProfile();
 *   const { logout } = useAuthActions();
 *   
 *   if (!profile) return <Loading />;
 *   
 *   return <div>Welcome {profile.email}</div>;
 * }
 * ```
 */
export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { redirectTo = '/login' } = options;
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const loading = useAuthLoading();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [loading, isAuthenticated, redirectTo, router]);
}

