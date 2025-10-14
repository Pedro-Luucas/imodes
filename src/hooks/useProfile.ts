'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile } from '@/lib/authClient';
import type { Profile } from '@/types/auth';

interface UseProfileOptions {
  requireAuth?: boolean;
  redirectTo?: string;
}

interface UseProfileReturn {
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isTherapist: boolean;
  isPatient: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook for getting the current user's full profile including role
 * This is different from useAuth which only gets basic user info
 */
export function useProfile(options: UseProfileOptions = {}): UseProfileReturn {
  const { requireAuth = true, redirectTo = '/login' } = options;
  const router = useRouter();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      // First check if user is authenticated
      const authData = await getProfile();
      
      // Then fetch their full profile from the profiles table
      const response = await fetch(`/api/patients/${authData.user.id}`, {
        method: 'GET',
      });

      // If not a patient, try as therapist
      if (!response.ok) {
        const therapistResponse = await fetch(`/api/therapists/${authData.user.id}`, {
          method: 'GET',
        });
        
        if (therapistResponse.ok) {
          const data = await therapistResponse.json();
          setProfile(data.profile);
          return;
        }
      } else {
        const data = await response.json();
        setProfile(data.profile);
        return;
      }
      
      // If we get here, couldn't fetch profile
      throw new Error('Profile not found');
    } catch {
      setProfile(null);
      if (requireAuth) {
        router.push(redirectTo);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetch = async () => {
    setLoading(true);
    await fetchProfile();
  };

  return {
    profile,
    loading,
    isAuthenticated: !!profile,
    isTherapist: profile?.role === 'therapist',
    isPatient: profile?.role === 'patient',
    refetch,
  };
}

