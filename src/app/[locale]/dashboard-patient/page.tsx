'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useRouter } from '@/i18n/navigation';
import { useAuthProfile } from '@/stores/authStore';
import { useCurrentTherapist, useTherapistActions } from '@/stores/therapistStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  PencilLine, 
  Clock, 
  Smile, 
  Wrench, 
  Timer,
  Loader2 
} from 'lucide-react';
import type { CanvasSession } from '@/types/canvas';

// interface Assignment {
//   id: string;
//   title: string;
//   description: string;
//   dueDate: string;
//   status: 'in-progress' | 'overdue' | 'completed';
// }

export default function DashboardPatientPage() {
  usePageMetadata('Patient Dashboard', 'View your therapy sessions, assignments, and progress.');
  const router = useRouter();
  const profile = useAuthProfile();
  const currentTherapist = useCurrentTherapist();
  const { getPatientTherapist } = useTherapistActions();
  const t = useTranslations('dashboardPatient');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Omit<CanvasSession, 'data'>[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // const [assignments] = useState<Assignment[]>([
  //   {
  //     id: '1',
  //     title: 'Assignment #3',
  //     description: 'Track your daily emotions and triggers',
  //     dueDate: 'Dec 22, 2025',
  //     status: 'in-progress',
  //   },
  //   {
  //     id: '2',
  //     title: 'Assignment #3',
  //     description: 'Track your daily emotions and triggers',
  //     dueDate: 'Dec 22, 2025',
  //     status: 'in-progress',
  //   },
  //   {
  //     id: '3',
  //     title: 'Assignment #3',
  //     description: 'Track your daily emotions and triggers',
  //     dueDate: 'Dec 22, 2025',
  //     status: 'overdue',
  //   },
  //   {
  //     id: '4',
  //     title: 'Assignment #3',
  //     description: 'Track your daily emotions and triggers',
  //     dueDate: 'Dec 22, 2025',
  //     status: 'completed',
  //   },
  // ]);

  useEffect(() => {
    const checkTherapist = async () => {
      if (profile?.id) {
        setLoading(true);
        const therapistData = await getPatientTherapist(profile.id);
        setLoading(false);
        
        // Redirect to no-therapist page if no therapist assigned
        if (!therapistData) {
          router.push('/dashboard-patient/no-therapist');
        }
      }
    };

    checkTherapist();
  }, [profile, getPatientTherapist, router]);

  const fetchSessions = useCallback(async () => {
    if (loading) {
      return;
    }

    const profileId = profile?.id;
    const profileRole = profile?.role;

    if (!profileId || profileRole !== 'patient') {
      setSessions([]);
      setSessionsLoading(false);
      return;
    }

    try {
      setSessionsLoading(true);
      setSessionsError(null);
      const response = await fetch('/api/sessions?limit=3', {
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t('sessionsError'));
      }

      const data = await response.json();
      setSessions(
        Array.isArray(data.sessions)
          ? (data.sessions as Omit<CanvasSession, 'data'>[])
          : []
      );
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
      setSessions([]);
      setSessionsError(
        error instanceof Error ? error.message : t('sessionsError')
      );
    } finally {
      setSessionsLoading(false);
    }
  }, [loading, profile?.id, profile?.role, t]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

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
      return t('unknownStatus');
    }

    switch (status.toLowerCase()) {
      case 'active':
        return t('activeStatus');
      case 'upcoming':
        return t('upcoming');
      case 'in-progress':
        return t('inProgress');
      case 'completed':
        return t('completed');
      case 'overdue':
        return t('overdue');
      case 'archived':
        return t('archivedStatus');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || profile.role !== 'patient') {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 py-8 px-6 md:px-12 lg:px-24">
      {/* Welcome Banner */}
      <Card className="border border-input rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-medium text-foreground">
              {t('welcome', { firstName: profile.first_name || profile.full_name || 'Paciente' })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('progressOverview')}
            </p>
          </div>
        </div>
      </Card>
    {/*
      Stats Cards   
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        Next Session
        <Card className="border border-input rounded-2xl p-4">
          <div className="flex gap-4 items-center">
            <div className="bg-stone-100 rounded-lg p-4">
              <Calendar className="w-6 h-6 text-stone-600" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-medium text-foreground">{t('nextSession')}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Dec 22, 2025</span>
              </div>
            </div>
          </div>
        </Card>

        Active Assignment
        <Card className="border border-input rounded-2xl p-4">
          <div className="flex gap-4 items-center">
            <div className="bg-stone-100 rounded-lg p-4">
              <PencilLine className="w-6 h-6 text-stone-600" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-medium text-foreground">{t('activeAssignment')}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>3 {t('pending')}</span>
              </div>
            </div>
          </div>
        </Card>

        Days Since Last Session
        <Card className="border border-input rounded-2xl p-4">
          <div className="flex gap-4 items-center">
            <div className="bg-stone-100 rounded-lg p-4">
              <Clock className="w-6 h-6 text-stone-600" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-medium text-foreground">{t('daysSinceLastSession')}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>3 {t('days')}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Two Column Layout - Sessions & Assignments */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent Sessions */}
        <Card className="border border-input rounded-2xl p-4">
          <div className="flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">{t('recentSessions')}</h2>
              <button
                className="text-sm text-sky-600 hover:underline"
                onClick={() => router.push('/dashboard-patient/sessions')}
              >
                {t('viewAll')}
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex flex-col gap-2 flex-1">
              {sessionsLoading ? (
                <div className="flex flex-1 items-center justify-center py-6 text-sm text-muted-foreground">
                  {t('loadingSessions')}
                </div>
              ) : sessionsError ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
                  <span>{t('sessionsError')}</span>
                  <span className="text-xs text-muted-foreground/80">{sessionsError}</span>
                  <button
                    className="text-sm text-sky-600 hover:underline"
                    onClick={() => void fetchSessions()}
                  >
                    {t('tryAgain')}
                  </button>
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-6 text-sm text-muted-foreground">
                  {t('noSessions')}
                </div>
              ) : (
                sessions.map((session) => {
                  const Icon = getSessionIcon(session.type);
                  const isTherapySession = session.type === 'session';
                  const bgColor = isTherapySession ? 'bg-sky-50' : 'bg-yellow-50';
                  const iconColor = isTherapySession ? 'text-sky-600' : 'text-yellow-600';

                  return (
                    <Card key={session.id} className="border border-input rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`${bgColor} rounded-lg p-6 flex items-center justify-center`}>
                            <Icon className={`w-6 h-6 ${iconColor}`} />
                          </div>
                          <div className="flex flex-col gap-2">
                            <h3 className="text-base font-medium text-foreground">
                              {session.name || t('sessionFallback')}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {currentTherapist?.full_name || currentTherapist?.first_name
                                ? t('withTherapist', {
                                    name: currentTherapist.full_name || currentTherapist.first_name,
                                  })
                                : t('assignedTherapist')}
                            </p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>{t('updatedAt', { date: formatDateTime(session.updated_at) })}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Timer className="w-4 h-4" />
                              <span>{t('createdAt', { date: formatDateTime(session.created_at) })}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={`${getStatusBadge(session.status)} h-8 px-4 rounded-lg font-semibold`}>
                          {getStatusLabel(session.status)}
                        </Badge>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Load More */}
            <button
              className="text-sm text-sky-600 hover:underline text-center"
              onClick={() => router.push('/dashboard-patient/sessions')}
            >
              {t('viewAllSessions')}
            </button>
          </div>
        </Card>

        {/*
        // {/* My Assignments * /}
        // <Card className="border border-input rounded-2xl p-4">
        //   <div className="flex flex-col gap-4 h-full">
        //     {/* Header * /}
        //     <div className="flex items-center justify-between">
        //       <h2 className="text-xl font-semibold text-foreground">{t('myAssignments')}</h2>
        //       <button className="text-sm text-sky-600 hover:underline">
        //         {t('viewAll')}
        //       </button>
        //     </div>
        //
        //     {/* Assignments List * /}
        //     <div className="flex flex-col gap-2 flex-1">
        //       {assignments.map((assignment) => (
        //         <Card key={assignment.id} className="border border-input rounded-2xl p-4">
        //           <div className="flex items-center justify-between">
        //             <div className="flex items-center gap-4">
        //               <div className="bg-stone-100 rounded-lg p-6 flex items-center justify-center">
        //                 <PencilLine className="w-6 h-6 text-stone-600" />
        //               </div>
        //               <div className="flex flex-col gap-2">
        //                 <h3 className="text-base font-medium text-foreground">
        //                   {assignment.title}
        //                 </h3>
        //                 <p className="text-sm text-muted-foreground">{assignment.description}</p>
        //                 <div className="flex items-center gap-1 text-sm text-muted-foreground">
        //                   <Calendar className="w-4 h-4" />
        //                   <span>{assignment.dueDate}</span>
        //                 </div>
        //               </div>
        //             </div>
        //             <Badge className={`${getStatusBadge(assignment.status)} h-8 px-4 rounded-lg font-semibold`}>
        //               {getStatusLabel(assignment.status)}
        //             </Badge>
        //           </div>
        //         </Card>
        //       ))}
        //     </div>
        //
        //     {/* Load More * /}
        //     <button className="text-sm text-sky-600 hover:underline text-center">
        //       {t('loadMoreAssignments')}
        //     </button>
        //   </div>
        // </Card>
        */}
      </div>
    </div>
  );
}

