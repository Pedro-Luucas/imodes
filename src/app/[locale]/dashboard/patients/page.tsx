'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, UserPlus, Calendar, Users, ClipboardList, Info, AlertTriangle } from 'lucide-react';
import { useAuthProfile } from '@/stores/authStore';
import type { Profile } from '@/types/auth';
import { PatientDetailsDialog } from '@/components/dashboard/PatientDetailsDialog';
import { InvitePatientDialog } from '@/components/dashboard/InvitePatientDialog';
import { CreateAssignmentDialog } from '@/components/dashboard/CreateAssignmentDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from '@/i18n/navigation';
import { PatientsPageSkeleton } from '@/components/skeleton-loaders/patients';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DevWarning } from '@/components/dashboard/DevWarning';

// Extended data for demonstration
interface ExtendedPatient extends Profile {
  sessions?: number;
  lastSession?: string;
  progress?: string;
}

interface PatientWithAvatar extends ExtendedPatient {
  avatarSignedUrl?: string | null;
}

const PATIENTS_PER_PAGE = 10;

export default function PatientsPage() {
  usePageMetadata('Patients', 'Manage and view all your patients.');
  const t = useTranslations('dashboard.patients');
  const router = useRouter();
  const profile = useAuthProfile();
  const [patients, setPatients] = useState<ExtendedPatient[]>([]);
  const [displayedPatients, setDisplayedPatients] = useState<PatientWithAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedPatientForAssignment, setSelectedPatientForAssignment] = useState<ExtendedPatient | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showInviteInfoDialog, setShowInviteInfoDialog] = useState(false);
  //const [avatarUrls, setAvatarUrls] = useState<Record<string, string | null>>({});

  // Redirect patients away from therapist dashboard
  useEffect(() => {
    if (profile && profile.role === 'patient') {
      router.push('/dashboard-patient');
    }
  }, [profile, router]);

  // Fetch avatar URL for a patient
  const fetchAvatarUrl = useCallback(async (patientId: string, avatarUrl: string | undefined) => {
    if (!avatarUrl) return null;
    
    try {
      const response = await fetch(`/api/profile/avatar/url/${patientId}`);
      if (response.ok) {
        const data = await response.json();
        return data.signed_url;
      }
    } catch (error) {
      console.error('Error fetching avatar URL for patient:', error);
    }
    return null;
  }, []);

  // Fetch patients data
  const fetchPatients = useCallback(async () => {
    if (!profile?.id) return;
    // Don't fetch if user is a patient
    if (profile.role === 'patient') return;

    try {
      setLoading(true);
      const response = await fetch(`/api/therapists/${profile.id}/patients`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }

      const data = await response.json();
      
      // Enhance patients with mock data for demonstration
      const enhancedPatients: ExtendedPatient[] = data.patients.map((patient: Profile, index: number) => ({
        ...patient,
        sessions: 8 + (index % 8),
        lastSession: index < 3 ? '2 Days ago' : index < 6 ? '1 Week ago' : '2 Weeks ago',
        progress: index % 3 === 0 ? 'Good' : index % 3 === 1 ? 'Excellent' : 'Fair',
      }));

      setPatients(enhancedPatients);

      // Fetch avatar URLs for all patients
      const avatarUrlPromises = enhancedPatients.map((patient) =>
        fetchAvatarUrl(patient.id, patient.avatar_url)
      );
      const signedUrls = await Promise.all(avatarUrlPromises);
      
      const avatarUrlMap: Record<string, string | null> = {};
      enhancedPatients.forEach((patient, index) => {
        avatarUrlMap[patient.id] = signedUrls[index];
      });
      //setAvatarUrls(avatarUrlMap);

      // Add avatar URLs to displayed patients
      const patientsWithAvatars: PatientWithAvatar[] = enhancedPatients.slice(0, PATIENTS_PER_PAGE).map((patient) => ({
        ...patient,
        avatarSignedUrl: avatarUrlMap[patient.id],
      }));
      
      setDisplayedPatients(patientsWithAvatars);
      setHasMore(enhancedPatients.length > PATIENTS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, fetchAvatarUrl]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show invite info dialog once when page loads
  useEffect(() => {
    if (!loading) {
      const hasSeenInviteInfo = localStorage.getItem('hasSeenInviteInfoDialog');
      if (!hasSeenInviteInfo) {
        setShowInviteInfoDialog(true);
      }
    }
  }, [loading]);

  const handleCloseInviteInfoDialog = () => {
    localStorage.setItem('hasSeenInviteInfoDialog', 'true');
    setShowInviteInfoDialog(false);
  };

  // Load more patients
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setTimeout(() => {
      const currentLength = displayedPatients.length;
      const nextPatients = patients.slice(
        currentLength,
        currentLength + PATIENTS_PER_PAGE
      );
      
      setDisplayedPatients((prev) => [...prev, ...nextPatients]);
      setHasMore(currentLength + nextPatients.length < patients.length);
      setLoadingMore(false);
    }, 500);
  }, [patients, displayedPatients, loadingMore, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loadMore]);

  // Calculate stats
  const stats = {
    totalPatients: patients.length,
    activeSessions: patients.filter((p) => p.lastSession === '2 Days ago').length,
    completedSessions: 47, // Mock data
    pendingAssignments: 5, // Mock data
  };

  const handleNavigateToPatient = (patientId: string) => {
    router.push(`/dashboard/patients/${patientId}`);
  };

  const handleCardClick = (patient: ExtendedPatient) => {
    if (isMobile) {
      handleNavigateToPatient(patient.id);
    }
  };

  const handleViewPatient = (patient: ExtendedPatient) => {
    if (isMobile) {
      handleNavigateToPatient(patient.id);
      return;
    }

    setSelectedPatient(patient);
    setDetailDialogOpen(true);
  };

  const handleSchedule = (patientId: string) => {
    console.log('Schedule session for patient:', patientId);
    // TODO: Implement scheduling logic
  };

  const handleStartNewSession = () => {
    console.log('Start new session clicked');
    // TODO: Connect to session creation flow
  };

  const handleCreateAssignment = (patient: ExtendedPatient) => {
    setSelectedPatientForAssignment(patient);
    setAssignmentDialogOpen(true);
  };

  const handleAssignmentCreated = () => {
    // Optionally refresh patient data or show success message
    console.log('Assignment created successfully');
  };

  if (loading) {
    return <PatientsPageSkeleton />;
  }

  return (
    <>
      <div className="flex flex-col gap-6 pt-6 pb-16 px-4 md:px-8 xl:px-40">
        {/* Page Title & Actions */}
        <div className="flex flex-col gap-3 px-1 md:px-6 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold text-foreground">
            {t('title')}
          </h1>
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="default"
              size="default"
              onClick={() => setInviteDialogOpen(true)}
            >
              <UserPlus className="w-5 h-5" />
              {t('invitePatient')}
            </Button>
          </div>
        </div>

        {/* Total Patients */}
        <div className="px-1 sm:px-6">
          <div className="flex flex-col gap-1">
            <p className="text-s font-semibold uppercase tracking-wide text-muted-foreground">
              {t('totalPatients')}
            </p>
            <p className="text-5xl font-bold text-primary leading-tight">
              {stats.totalPatients}
            </p>
              <DevWarning text={t('devWarning')} />
          </div>
        </div>

        {/* CTA Section */}
        <div className="flex flex-col gap-3 px-1 sm:px-6 md:flex-row md:items-center hidden">
          <Button
            variant="outline"
            className="h-12 w-full border-2 border-dashed border-input bg-background text-foreground shadow-none hover:bg-muted"
            onClick={handleStartNewSession}
          >
            <Plus className="w-4 h-4" />
            {t('startNewSession')}
          </Button>
          <Button
            variant="default"
            className="h-12 w-full md:hidden"
            onClick={() => setInviteDialogOpen(true)}
          >
            <UserPlus className="w-5 h-5" />
            {t('invitePatient')}
          </Button>
        </div>

        {/* Assignments Section */}
        <div className="px-1 sm:px-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {t('assignments')}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {displayedPatients.map((patient) => (
              <Card
                key={`assignment-${patient.id}`}
                className={`border border-input rounded-2xl p-4 shadow-sm transition ${
                  isMobile ? 'cursor-pointer hover:shadow-md' : ''
                }`}
                onClick={() => handleCardClick(patient)}
              >
                <div className="flex flex-col gap-4">
                  {/* Patient Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage
                          src={patient.avatarSignedUrl || undefined}
                          alt={patient.full_name || 'Profile picture'}
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {patient.full_name
                            ? patient.full_name
                                .split(' ')
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                            : 'P'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex flex-col gap-1">
                        <h3 className="text-base font-semibold text-foreground">
                          {patient.full_name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {t('memberSince')}{' '}
                            {new Date(patient.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-none px-4 h-7 rounded-full font-medium">
                      {t('active')}
                    </Badge>
                  </div>

                  {/* Patient Stats */}
                  <div className="flex flex-col divide-y divide-input rounded-xl border border-input">
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-sm text-muted-foreground">
                        {t('sessions')}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {patient.sessions}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-sm text-muted-foreground">
                        {t('lastSession')}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {patient.lastSession}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-sm text-muted-foreground">
                        {t('progress')}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {patient.progress}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Button
                      variant="default"
                      className="h-11 w-full hidden"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSchedule(patient.id);
                      }}
                    >
                      {t('schedule')}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-11 w-full"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleViewPatient(patient);
                      }}
                    >
                      {t('view')}
                    </Button>
                    <Button
                      variant="outline"
                      className="hidden h-11 w-full"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCreateAssignment(patient);
                      }}
                    >
                      <ClipboardList className="w-4 h-4" />
                      {t('assignment')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex justify-center px-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              {t('loadingMore')}
            </div>
          </div>
        )}

        {/* Infinite Scroll Observer Target */}
        {hasMore && !loadingMore && (
          <div ref={observerTarget} className="h-10 px-6" />
        )}

        {/* No More Patients Message */}
        {!hasMore && displayedPatients.length > 0 && (
          <div className="text-center text-sm text-muted-foreground px-6">
            {t('allLoaded')}
          </div>
        )}

        {/* No Patients Message */}
        {displayedPatients.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('noPatients')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('noPatientsDesc')}
            </p>
            <Button variant="default" onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="w-5 h-5" />
              {t('addPatientButton')}
            </Button>
          </div>
        )}
      </div>

      {/* Patient Details Dialog */}
      <PatientDetailsDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        patient={selectedPatient}
        onSchedule={handleSchedule}
      />

      {/* Invite Patient Dialog */}
      {profile?.id && (
        <InvitePatientDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          therapistId={profile.id}
        />
      )}

      {/* Create Assignment Dialog */}
      {selectedPatientForAssignment && (
        <CreateAssignmentDialog
          open={assignmentDialogOpen}
          onOpenChange={setAssignmentDialogOpen}
          patientId={selectedPatientForAssignment.id}
          patientName={selectedPatientForAssignment.full_name}
          onAssignmentCreated={handleAssignmentCreated}
        />
      )}

      {/* Invite Info Dialog - shows once to explain new invitation flow */}
      <AlertDialog open={showInviteInfoDialog} onOpenChange={setShowInviteInfoDialog} >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <AlertDialogTitle className="text-xl">
                {t('inviteInfoTitle')} 🎉
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          <div className="text-base leading-relaxed space-y-4 text-muted-foreground">
            <p>
              <strong>{t('inviteInfoIntro')}</strong>
            </p>
            <p>
              {t('inviteInfoDescription')}
            </p>
            <ol className="list-decimal list-inside space-y-2 text-foreground">
              <li>{t('inviteInfoStep1')}</li>
              <li>{t('inviteInfoStep2')}</li>
              <li>{t('inviteInfoStep3')}</li>
              <li>{t('inviteInfoStep4')}</li>
            </ol>
            <p>
              {t('inviteInfoConclusion')}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCloseInviteInfoDialog} className="w-full sm:w-auto">
              {t('inviteInfoButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
