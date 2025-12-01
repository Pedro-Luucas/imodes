'use client';

import { useState, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Pencil, Check, X } from 'lucide-react';
import type { Profile } from '@/types/auth';

const buildDefaultSessionName = () => {
  const now = new Date();
  return `Session - ${now.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;
};

interface SelectPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  therapistId: string;
  onSelect: (patientId: string | null, type: string, name?: string) => Promise<void> | void;
}

export function SelectPatientDialog({
  open,
  onOpenChange,
  therapistId,
  onSelect,
}: SelectPatientDialogProps) {
  const t = useTranslations('selectPatientDialog');
  const [patients, setPatients] = useState<Profile[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const initialSessionName = buildDefaultSessionName();
  const [sessionName, setSessionName] = useState(initialSessionName);
  const [sessionNameDraft, setSessionNameDraft] = useState(initialSessionName);
  const [editingName, setEditingName] = useState(false);
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

  const resetDialogState = () => {
    const defaultName = buildDefaultSessionName();
    setSessionName(defaultName);
    setSessionNameDraft(defaultName);
    setEditingName(false);
    setSelectedPatientId(null);
  };

  const handleClose = (nextOpen = false, force = false) => {
    if (!loading || force) {
      if (!nextOpen) {
        resetDialogState();
      }
      onOpenChange(nextOpen);
    }
  };

  const handleSubmit = async () => {
    const trimmedName = sessionName.trim();
    if (!trimmedName) {
      return;
    }

    setLoading(true);
    const type = selectedPatientId === null ? 'playground' : 'session';
    try {
      await onSelect(selectedPatientId, type, trimmedName);
      handleClose(false, true);
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditingName = () => {
    setSessionNameDraft(sessionName);
    setEditingName(true);
  };

  const handleCancelEditingName = () => {
    setSessionNameDraft(sessionName);
    setEditingName(false);
  };

  const handleConfirmEditingName = () => {
    const trimmed = sessionNameDraft.trim();
    if (!trimmed) {
      setSessionNameDraft(sessionName);
      setEditingName(false);
      return;
    }
    setSessionName(trimmed);
    setEditingName(false);
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirmEditingName();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelEditingName();
    }
  };

  const isCreateDisabled = loading || loadingPatients || sessionName.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="session-name">{t('sessionName')}</Label>
            {editingName ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="session-name"
                  value={sessionNameDraft}
                  onChange={(event) => setSessionNameDraft(event.target.value)}
                  onKeyDown={handleNameKeyDown}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCancelEditingName}
                    aria-label={t('cancelEdit')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleConfirmEditingName}
                    aria-label={t('saveEdit')}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                <span className="font-medium text-foreground">{sessionName}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={handleStartEditingName}
                  aria-label={t('editName')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="patient">{t('patient')}</Label>
            {loadingPatients ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">{t('loadingPatients')}</span>
              </div>
            ) : (
              <Select
                value={selectedPatientId || 'none'}
                onValueChange={(value) => setSelectedPatientId(value === 'none' ? null : value)}
              >
                <SelectTrigger id="patient" className="w-full">
                  <SelectValue placeholder={t('selectPatient')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('noPatient')}</SelectItem>
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
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isCreateDisabled}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t('creating')}
                </>
              ) : (
                t('createSession')
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

