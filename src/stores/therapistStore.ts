'use client';

import { create } from 'zustand';
import type { Profile } from '@/types/auth';

/**
 * Therapist State
 */
interface TherapistState {
  therapists: Profile[];
  currentTherapist: Profile | null;
  loading: boolean;
  error: string | null;
}

/**
 * Therapist Actions
 */
interface TherapistActions {
  /**
   * Search/list therapists
   */
  searchTherapists: (search?: string) => Promise<void>;
  
  /**
   * Get a patient's assigned therapist
   */
  getPatientTherapist: (patientId: string) => Promise<Profile | null>;
  
  /**
   * Assign a therapist to a patient (or self-assign)
   */
  assignTherapist: (patientId: string, therapistId: string) => Promise<void>;
  
  /**
   * Clear error
   */
  clearError: () => void;
}

/**
 * Internal Zustand store
 */
const useTherapistStore = create<TherapistState & { actions: TherapistActions }>((set) => ({
  // Initial state
  therapists: [],
  currentTherapist: null,
  loading: false,
  error: null,
  
  // Actions object - stable reference
  actions: {
    searchTherapists: async (search = '') => {
      set({ loading: true, error: null });
      try {
        const params = new URLSearchParams();
        if (search) {
          params.append('search', search);
        }
        
        const response = await fetch(`/api/therapists?${params.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch therapists');
        }
        
        const data = await response.json();
        set({ 
          therapists: data.therapists,
          loading: false 
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        set({ 
          error: errorMessage,
          loading: false,
          therapists: []
        });
      }
    },
    
    getPatientTherapist: async (patientId: string) => {
      set({ loading: true, error: null });
      try {
        const response = await fetch(`/api/patients/${patientId}/therapist`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch therapist');
        }
        
        const data = await response.json();
        set({ 
          currentTherapist: data.therapist,
          loading: false 
        });
        return data.therapist;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        set({ 
          error: errorMessage,
          loading: false,
          currentTherapist: null
        });
        return null;
      }
    },
    
    assignTherapist: async (patientId: string, therapistId: string) => {
      set({ loading: true, error: null });
      try {
        const response = await fetch(`/api/patients/${patientId}/therapist`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ therapistId }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to assign therapist');
        }
        
        const data = await response.json();
        
        // Refresh the current therapist after assignment
        const therapistResponse = await fetch(`/api/patients/${patientId}/therapist`);
        if (therapistResponse.ok) {
          const therapistData = await therapistResponse.json();
          set({ 
            currentTherapist: therapistData.therapist,
            loading: false 
          });
        } else {
          set({ loading: false });
        }
        
        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        set({ 
          error: errorMessage,
          loading: false
        });
        throw error;
      }
    },
    
    clearError: () => {
      set({ error: null });
    },
  },
}));

/**
 * Atomic selector hooks
 */

export const useTherapists = () => useTherapistStore((state) => state.therapists);
export const useCurrentTherapist = () => useTherapistStore((state) => state.currentTherapist);
export const useTherapistLoading = () => useTherapistStore((state) => state.loading);
export const useTherapistError = () => useTherapistStore((state) => state.error);
export const useTherapistActions = () => useTherapistStore((state) => state.actions);

