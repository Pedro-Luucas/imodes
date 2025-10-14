import { createSupabaseServerClient } from './supabaseServerClient';
import { getUserFromCookie } from './auth';
import type { Profile } from '@/types/auth';

/**
 * Gets the profile for a user including their role
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data as Profile;
}

/**
 * Gets the authenticated user and their profile
 * Returns null if not authenticated
 */
export async function getAuthenticatedUserWithProfile(): Promise<{
  userId: string;
  profile: Profile;
} | null> {
  const user = await getUserFromCookie();
  
  if (!user) {
    return null;
  }
  
  const profile = await getUserProfile(user.id);
  
  if (!profile) {
    return null;
  }
  
  return {
    userId: user.id,
    profile,
  };
}

/**
 * Checks if the authenticated user has the required role
 */
export async function hasRole(
  requiredRoles: ('therapist' | 'patient' | 'admin')[]
): Promise<{ authorized: boolean; profile?: Profile }> {
  const authData = await getAuthenticatedUserWithProfile();
  
  if (!authData) {
    return { authorized: false };
  }
  
  const { profile } = authData;
  
  // Check if user has one of the required roles
  const authorized = requiredRoles.includes(profile.role as 'therapist' | 'patient' | 'admin');
  
  return { authorized, profile };
}

