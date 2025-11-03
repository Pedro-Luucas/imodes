'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, User, Phone, Mail, Activity } from 'lucide-react';
import type { Profile } from '@/types/auth';

interface PatientDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Profile | null;
  onSchedule?: (patientId: string) => void;
}

export function PatientDetailsDialog({
  open,
  onOpenChange,
  patient,
  onSchedule,
}: PatientDetailsDialogProps) {
  const t = useTranslations('dashboard.patientDetails');
  if (!patient) return null;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Patient Header */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              {patient.avatar_url ? (
                <AvatarImage src={patient.avatar_url} alt={patient.full_name} />
              ) : (
                <AvatarFallback className="bg-purple-100 text-purple-600 text-lg font-semibold">
                  {getInitials(patient.full_name)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground">
                {patient.full_name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <User className="w-4 h-4" />
                <span>{patient.role}</span>
              </div>
            </div>
            <Badge
              className={
                patient.is_active
                  ? 'bg-green-50 text-green-600 border-transparent'
                  : 'bg-gray-100 text-gray-600 border-transparent'
              }
            >
              {patient.is_active ? t('active') : t('inactive')}
            </Badge>
          </div>

          {/* Contact Information */}
          <div className="border border-input rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {t('contactInformation')}
            </h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{patient.email}</span>
              </div>
              {patient.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{patient.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Activity Summary */}
          <div className="border border-input rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {t('activitySummary')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('status')}</p>
                  <p className="text-sm font-medium text-foreground">
                    {patient.subscription_active ? t('activeSubscription') : t('noSubscription')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('memberSince')}</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(patient.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {patient.settings && Object.keys(patient.settings).length > 0 && (
            <div className="border border-input rounded-lg p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">
                {t('additionalInformation')}
              </h4>
              <div className="text-sm text-muted-foreground">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(patient.settings, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            {t('close')}
          </Button>
          {onSchedule && (
            <Button
              variant="default"
              onClick={() => {
                onSchedule(patient.id);
                onOpenChange(false);
              }}
            >
              {t('scheduleSession')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

