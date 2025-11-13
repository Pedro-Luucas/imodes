'use client';

import { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Profile } from '@/types/auth';
import { toast } from 'sonner';

interface SessionDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  userRole?: 'patient' | 'therapist';
  patientProfile?: Profile | null;
  therapistProfile?: Profile | null;
  sessionType?: string;
  language?: string;
  initialNotes?: string;
  onNotesChange?: (notes: string) => void;
  currentDuration?: number; // Current session duration in seconds
}

export function SessionDetailsPanel({
  isOpen,
  onClose,
  sessionId,
  userRole,
  patientProfile,
  therapistProfile,
  sessionType = 'Individual',
  language = 'English',
  initialNotes = '',
  onNotesChange,
  currentDuration = 0,
}: SessionDetailsPanelProps) {
  const [notes, setNotes] = useState(initialNotes);
  const isTherapist = userRole === 'therapist';

  // Format duration as MM:SS or HH:MM:SS
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle notes change
  const handleNotesChange = (value: string) => {
    setNotes(value);
    onNotesChange?.(value);
  };

  // Save notes to session
  const handleSaveNotes = async () => {
    if (!sessionId || !isTherapist) return;

    try {
      // Fetch current session data
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }

      const data = await response.json();
      const session = data.session;

      // Update therapist settings with notes
      const updatedData = {
        ...session.data,
        therapistSettings: {
          ...session.data.therapistSettings,
          notes: notes,
        },
      };

      // Save to session
      const saveResponse = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: updatedData }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save notes');
      }

      toast.success('Notes saved successfully');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };

  // Auto-save notes on blur (debounced)
  useEffect(() => {
    if (!isTherapist || !sessionId || notes === initialNotes) return;

    const timeoutId = setTimeout(() => {
      handleSaveNotes();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notes, isTherapist, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update notes when initialNotes changes
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  if (!isOpen) return null;

  const getDisplayName = (profile?: Profile | null) => {
    if (profile?.full_name) return profile.full_name;
    if (profile?.first_name) return profile.first_name;
    return 'Unknown';
  };

  const getDisplayId = () => {
    if (isTherapist && patientProfile) {
      return `Patient ID: #P-${patientProfile.id.slice(0, 8).toUpperCase()}`;
    }
    if (!isTherapist && therapistProfile) {
      return `Therapist ID: #T-${therapistProfile.id.slice(0, 8).toUpperCase()}`;
    }
    return '';
  };

  return (
    <div className="fixed right-8 top-20 z-20 w-[350px]">
      <div className="bg-white border border-stroke rounded-2xl p-6 flex flex-col gap-4 shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-foreground">Session Details</h3>
          <Button
            variant="ghost"
            size="icon"
            className="size-4 hover:bg-transparent"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Profile Card - Only show if patient profile exists */}
        {isTherapist && patientProfile && (
          <div className="border border-stroke rounded-2xl p-4">
            <div className="flex gap-4 items-center">
              <div className="bg-purple-100 rounded-lg p-3 flex items-center justify-center size-12">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base font-medium text-foreground">
                  {getDisplayName(patientProfile)}
                </span>
                <span className="text-sm text-stone-500">
                  {getDisplayId()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Profile Card - For patients viewing therapist */}
        {!isTherapist && therapistProfile && (
          <div className="border border-stroke rounded-2xl p-4">
            <div className="flex gap-4 items-center">
              <div className="bg-purple-100 rounded-lg p-3 flex items-center justify-center size-12">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base font-medium text-foreground">
                  {getDisplayName(therapistProfile)}
                </span>
                <span className="text-sm text-stone-500">
                  {getDisplayId()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Session Info */}
        <div className="flex flex-col">
          {/* Type */}
          <div className="border-b border-stroke py-2.5 flex items-center justify-between">
            <span className="text-sm text-stone-500">Type</span>
            <span className="text-sm text-foreground capitalize">{sessionType || 'N/A'}</span>
          </div>

          {/* Duration - Only for therapist */}
          {isTherapist && (
            <div className="border-b border-stroke py-2.5 flex items-center justify-between">
              <span className="text-sm text-stone-500">Duration</span>
              <span className="text-sm text-foreground">{formatDuration(currentDuration)}</span>
            </div>
          )}

          {/* Language */}
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-sm text-stone-500">Language</span>
            <span className="text-sm text-foreground">{language}</span>
          </div>
        </div>

        {/* Notes - Only for therapist 
        {isTherapist && (
          <div className="flex flex-col gap-2">
            <label className="text-sm text-foreground">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Write Private Notes"
              className="min-h-[80px] resize-none"
            />
          </div>
        )}     PUT IT BACK IN IF YOU WANT TO ENABLE NOTES           */}
      </div>
    </div>
  );
}

