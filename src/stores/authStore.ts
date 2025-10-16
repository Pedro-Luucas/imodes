'use client';

import { create } from 'zustand';
import { getProfile, logout as logoutApi } from '@/lib/authClient';
import type { Profile } from '@/types/auth';

/**
 * Auth State
 */
interface AuthState {
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
}

/**
 * Auth Actions
 */
interface AuthActions {
  /**
   * Initialize auth state by fetching user profile
   */
  initialize: () => Promise<void>;
  
  /**
   * Logout the current user
   */
  logout: () => Promise<void>;
  
  /**
   * Manually refetch user data
   */
  refetch: () => Promise<void>;
  
  /**
   * Set profile data directly
   */
  setProfile: (profile: Profile | null) => void;
}

/**
 * Internal Zustand store - not exported
 */
const useAuthStore = create<AuthState & { actions: AuthActions }>((set) => ({
  // Initial state
  profile: null,
  loading: true,
  isAuthenticated: false,
  
  // Actions object - stable reference
  actions: {
    initialize: async () => {
      set({ loading: true });
      try {
        const data = await getProfile();
        set({ 
          profile: data.profile, 
          isAuthenticated: true,
          loading: false 
        });
      } catch {
        set({ 
          profile: null, 
          isAuthenticated: false,
          loading: false 
        });
      }
    },
    
    logout: async () => {
      try {
        await logoutApi();
        set({ 
          profile: null, 
          isAuthenticated: false 
        });
      } catch (error) {
        console.error('Logout failed:', error);
        throw error;
      }
    },
    
    refetch: async () => {
      set({ loading: true });
      try {
        const data = await getProfile();
        set({ 
          profile: data.profile, 
          isAuthenticated: true,
          loading: false 
        });
      } catch {
        set({ 
          profile: null, 
          isAuthenticated: false,
          loading: false 
        });
      }
    },
    
    setProfile: (profile) => {
      set({ 
        profile, 
        isAuthenticated: !!profile 
      });
    },
  },
}));

/**
 * Atomic selector hooks - only these are exported
 */

/**
 * Get the current authenticated user's profile
 */
export const useAuthProfile = () => useAuthStore((state) => state.profile);

/**
 * Get the loading state
 */
export const useAuthLoading = () => useAuthStore((state) => state.loading);

/**
 * Get the authentication status
 */
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);

/**
 * Get auth actions (stable reference)
 */
export const useAuthActions = () => useAuthStore((state) => state.actions);

