'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useRouter } from '@/i18n/navigation';
import { useAuthProfile } from '@/stores/authStore';
import { useCurrentTherapist, useTherapistActions } from '@/stores/therapistStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Timer,
  Smile,
  Wrench,
} from 'lucide-react';
import type { CanvasSession } from '@/types/canvas';

type SessionSummary = Omit<CanvasSession, 'data'>;

export default function PatientSessionsPage() {
  const t = useTranslations('dashboardPatientSessions');
  const dashboardPatientTranslations = useTranslations('dashboardPatient');
  usePageMetadata(t('title'), t('subtitle'));
  const router = useRouter();
  const profile = useAuthProfile();
  const therapist = useCurrentTherapist();
  const { getPatientTherapist } = useTherapistActions();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!profile?.id || profile.role !== 'patient') {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sessions?type=session', {
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t('errorMessage'));
      }

      const data = await response.json();
      setSessions(
        Array.isArray(data.sessions) ? (data.sessions as SessionSummary[]) : []
      );
    } catch (err) {
      console.error('Error loading therapy sessions:', err);
      setSessions([]);
      setError(err instanceof Error ? err.message : t('errorMessage'));
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.role, t]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (profile?.id && profile.role === 'patient' && !therapist) {
      void getPatientTherapist(profile.id);
    }
  }, [getPatientTherapist, profile?.id, profile?.role, therapist]);

  const getSessionIcon = (type?: string | null) => {
    switch (type) {
      case 'playground':
        return Wrench;
      case 'session':
      default:
        return Smile;
    }
  };

  const getStatusBadge = (status?: string | null) => {
    const normalized = status?.toLowerCase();

    switch (normalized) {
      case 'active':
      case 'upcoming':
        return 'bg-sky-50 text-sky-600 border-transparent';
      case 'in-progress':
        return 'bg-green-50 text-green-600 border-transparent';
      case 'completed':
        return 'bg-neutral-200 text-muted-foreground border-transparent';
      case 'overdue':
      case 'archived':
        return 'bg-red-50 text-red-500 border-transparent';
      default:
        return 'bg-neutral-200 text-muted-foreground border-transparent';
    }
  };

  const getStatusLabel = (status?: string | null) => {
    if (!status) {
      return dashboardPatientTranslations('unknownStatus');
    }

    switch (status.toLowerCase()) {
      case 'active':
        return dashboardPatientTranslations('activeStatus');
      case 'upcoming':
        return dashboardPatientTranslations('upcoming');
      case 'in-progress':
        return dashboardPatientTranslations('inProgress');
      case 'completed':
        return dashboardPatientTranslations('completed');
      case 'overdue':
        return dashboardPatientTranslations('overdue');
      case 'archived':
        return dashboardPatientTranslations('archivedStatus');
      default:
        return status;
    }
  };

  const formatDateTime = (isoDate?: string | null) => {
    if (!isoDate) {
      return 'Date unavailable';
    }

    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(isoDate));
    } catch {
      return isoDate;
    }
  };

  const handleOpenSession = (sessionId: string) => {
    router.push(`/canvas?sessionId=${sessionId}`);
  };

  if (!profile || profile.role !== 'patient') {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 py-8 px-6 md:px-12 lg:px-24">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
          {therapist && (
            <p className="text-sm text-muted-foreground">
              {t('therapistLabel')}{' '}
              {therapist.full_name || therapist.first_name || t('therapistFallback')}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard-patient')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToDashboard')}
          </Button>
          <Button onClick={() => void fetchSessions()}>{t('refresh')}</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="border border-destructive/50 bg-destructive/5 p-6 text-center text-sm text-destructive">
          <p>{t('errorMessage')}</p>
          {error !== t('errorMessage') && (
            <p className="mt-2 text-xs text-destructive/80">{error}</p>
          )}
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void fetchSessions()}
          >
            {t('tryAgain')}
          </Button>
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="border border-input rounded-2xl p-8 text-center text-muted-foreground">
          <p>{t('emptyState')}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {sessions.map((session) => {
            const Icon = getSessionIcon(session.type);
            const isTherapySession = session.type === 'session';
            const bgColor = isTherapySession ? 'bg-sky-50' : 'bg-yellow-50';
            const iconColor = isTherapySession ? 'text-sky-600' : 'text-yellow-600';

            return (
              <Card key={session.id} className="border border-input rounded-2xl p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`${bgColor} rounded-lg p-4 flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${iconColor}`} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-semibold text-foreground">
                          {session.name || t('sessionFallback')}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {t('updatedAt', { date: formatDateTime(session.updated_at) })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{t('createdAt', { date: formatDateTime(session.created_at) })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Timer className="w-4 h-4" />
                          <span>{t('sessionId', { id: session.id })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 md:items-end">
                    <Badge className={`${getStatusBadge(session.status)} h-8 px-4 rounded-lg font-semibold`}>
                      {getStatusLabel(session.status)}
                    </Badge>
                    <Button
                      variant="outline"
                      className="self-start md:self-auto"
                      onClick={() => handleOpenSession(session.id)}
                    >
                      {t('openSession')}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

