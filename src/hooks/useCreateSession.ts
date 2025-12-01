'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UseCreateSessionOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface CreateSessionPayload {
  patient_id: string | null;
  type: string;
  name?: string;
}

export function useCreateSession(options?: UseCreateSessionOptions) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const createSession = useCallback(
    async (patientId: string | null, type: string, sessionName?: string) => {
      try {
        setCreating(true);
        const trimmedName = sessionName?.trim();
        const payload: CreateSessionPayload = {
          patient_id: patientId,
          type: type,
        };

        if (trimmedName) {
          payload.name = trimmedName;
        }

        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create session');
        }

        const data = await response.json();
        options?.onSuccess?.();
        router.push(`/canvas?sessionId=${data.session.id}`);
      } catch (error) {
        console.error('Error creating session:', error);
        const err = error instanceof Error ? error : new Error('Failed to create session');
        toast.error(err.message);
        options?.onError?.(err);
      } finally {
        setCreating(false);
      }
    },
    [router, options]
  );

  return {
    createSession,
    creating,
  };
}

