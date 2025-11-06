'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { Profile } from '@/types/auth';

interface SelectPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  therapistId: string;
  onSelect: (patientId: string | null, type: string) => void;
}

export function SelectPatientDialog({
  open,
  onOpenChange,
  therapistId,
  onSelect,
}: SelectPatientDialogProps) {
  const [patients, setPatients] = useState<Profile[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const fetchPatients = useCallback(async () => {
    try {
      setLoadingPatients(true);
      const response = await fetch(`/api/therapists/${therapistId}/patients`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }

      const data = await response.json();
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  }, [therapistId]);

  useEffect(() => {
    if (open && therapistId) {
      void fetchPatients();
    }
  }, [open, therapistId, fetchPatients]);

  const handleSubmit = () => {
    setLoading(true);
    const type = selectedPatientId === null ? 'playground' : 'session';
    onSelect(selectedPatientId, type);
    setLoading(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedPatientId(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Patient</DialogTitle>
          <DialogDescription>
            Choose a patient for this session, or select &quot;No Patient&quot; to create a playground session.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="patient">Patient</Label>
            {loadingPatients ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading patients...</span>
              </div>
            ) : (
              <Select
                value={selectedPatientId || 'none'}
                onValueChange={(value) => setSelectedPatientId(value === 'none' ? null : value)}
              >
                <SelectTrigger id="patient" className="w-full">
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Patient (Playground)</SelectItem>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.full_name || patient.first_name || patient.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || loadingPatients}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Session'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

