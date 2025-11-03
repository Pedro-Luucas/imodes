'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import type { Notification } from '@/types/notifications';

interface AcceptRejectPatientDialogProps {
  notification: Notification;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function AcceptRejectPatientDialog({
  notification,
  open,
  onOpenChange,
  onComplete,
}: AcceptRejectPatientDialogProps) {
  const t = useTranslations('therapistRequest');
  const [loading, setLoading] = useState(false);

  const patientName = notification.data?.patient_name as string;
  const patientEmail = notification.data?.patient_email as string;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleResponse = async (action: 'accept' | 'reject') => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/therapists/request/${notification.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} request`);
      }

      if (action === 'accept') {
        toast.success(t('acceptSuccess'), {
          description: t('acceptSuccessDesc', { patientName }),
        });
      } else {
        toast.info(t('declineSuccess'), {
          description: t('declineSuccessDesc', { patientName }),
        });
      }

      onOpenChange(false);
      onComplete?.();
    } catch (err) {
      toast.error(t('errors.processFailed'), {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          <Avatar className="w-20 h-20 mb-4">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {getInitials(patientName || 'UN')}
            </AvatarFallback>
          </Avatar>

          <h3 className="text-lg font-semibold">{patientName}</h3>
          <p className="text-sm text-muted-foreground">{patientEmail}</p>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => handleResponse('reject')}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserX className="w-4 h-4 mr-2" />
            )}
            {t('decline')}
          </Button>
          <Button
            onClick={() => handleResponse('accept')}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4 mr-2" />
            )}
            {t('accept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

