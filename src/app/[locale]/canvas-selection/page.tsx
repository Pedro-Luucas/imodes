'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useAuthProfile } from '@/stores/authStore';
import { useCreateSession } from '@/hooks/useCreateSession';
import { Trash2, Pencil, Check, X, UserCircle2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { CanvasSession } from '@/types/canvas';
import { SelectPatientDialog } from '@/components/canvas/SelectPatientDialog';
import type { Profile } from '@/types/auth';

export default function CanvasSelectionPage() {
  const t = useTranslations('canvasSelection');
  usePageMetadata(t('pageTitle'), t('pageDescription'));
  const router = useRouter();
  const profile = useAuthProfile();
  const { createSession, creating } = useCreateSession();
  const [sessions, setSessions] = useState<Omit<CanvasSession, 'data'>[]>([])
  const [loading, setLoading] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [therapistPatients, setTherapistPatients] = useState<Profile[]>([]);
  const [checkingPatients, setCheckingPatients] = useState(false);
  const [profileCache, setProfileCache] = useState<Record<string, Profile>>({});
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const youLabel = t('labels.you');

  useEffect(() => {
    fetchSessions();
  }, []);

  const checkTherapistPatients = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      setCheckingPatients(true);
      const response = await fetch(`/api/therapists/${profile.id}/patients`);
      
      if (response.ok) {
        const data = await response.json();
        setTherapistPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Error checking therapist patients:', error);
      setTherapistPatients([]);
    } finally {
      setCheckingPatients(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    // Check if therapist has patients when component mounts
    if (profile?.role === 'therapist' && profile?.id) {
      void checkTherapistPatients();
    }
  }, [profile, checkTherapistPatients]);

  const therapistPatientMap = useMemo(() => {
    if (!therapistPatients || therapistPatients.length === 0) {
      return {};
    }
    return therapistPatients.reduce<Record<string, Profile>>((acc, patient) => {
      acc[patient.id] = patient;
      return acc;
    }, {});
  }, [therapistPatients]);

  useEffect(() => {
    if (sessions.length === 0) return;

    const missingProfileIds = new Set<string>();

    sessions.forEach((session) => {
      if (session.therapist_id && session.therapist_id !== profile?.id && !profileCache[session.therapist_id]) {
        missingProfileIds.add(session.therapist_id);
      }

      if (session.patient_id) {
        if (session.patient_id === profile?.id) {
          return;
        }

        if (profile?.role === 'therapist' && therapistPatientMap[session.patient_id]) {
          return;
        }

        if (!profileCache[session.patient_id]) {
          missingProfileIds.add(session.patient_id);
        }
      }
    });

    if (missingProfileIds.size === 0) return;

    let cancelled = false;
    setProfilesLoading(true);

    const fetchProfiles = async () => {
      try {
        const entries = await Promise.all(
          Array.from(missingProfileIds).map(async (id) => {
            try {
              const response = await fetch(`/api/profiles/${id}`);
              if (!response.ok) {
                console.debug(`Profile ${id} responded with ${response.status}, skipping cache update.`);
                return [id, null] as const;
              }
              const data = await response.json().catch(() => null);
              if (!data?.profile) {
                console.debug(`Profile ${id} payload missing profile data, skipping cache update.`);
                return [id, null] as const;
              }
              return [id, data.profile as Profile] as const;
            } catch (error) {
              console.debug(`Non-blocking profile fetch error for ${id}:`, error);
              return [id, null] as const;
            }
          })
        );

        if (!cancelled) {
          setProfileCache((prev) => {
            const next = { ...prev };
            entries.forEach(([id, fetchedProfile]) => {
              if (fetchedProfile) {
                next[id] = fetchedProfile;
              }
            });
            return next;
          });
        }
      } catch (error) {
        console.debug('Non-blocking profile sync error:', error);
      } finally {
        if (!cancelled) {
          setProfilesLoading(false);
        }
      }
    };

    void fetchProfiles();

    return () => {
      cancelled = true;
    };
  }, [sessions, profileCache, profile?.id, profile?.role, therapistPatientMap]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error(t('errors.fetchSessions'));
      }
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    // If therapist has no patients, create playground session directly
    if (profile?.role === 'therapist' && therapistPatients.length === 0 && !checkingPatients) {
      createSession(null, 'playground');
    } else if (profile?.role === 'therapist') {
      // Show patient selection dialog
      setShowPatientDialog(true);
    } else {
      // For patients, create session directly
      createSession(null, 'session');
    }
  };

  const handleOpenSession = (sessionId: string) => {
    router.push(`/canvas?sessionId=${sessionId}`);
  };

  const getSessionDisplayName = (session: Omit<CanvasSession, 'data'>) => {
    if (session.name && session.name.trim().length > 0) {
      return session.name.trim();
    }
    return session.type === 'playground'
      ? t('defaultNames.playground')
      : t('defaultNames.untitled');
  };

  const getStatusLabel = (status?: string | null) => {
    if (!status) {
      return t('statuses.active');
    }

    switch (status.toLowerCase()) {
      case 'active':
        return t('statuses.active');
      case 'upcoming':
        return t('statuses.upcoming');
      case 'pending':
        return t('statuses.pending');
      case 'in-progress':
        return t('statuses.inProgress');
      case 'completed':
        return t('statuses.completed');
      case 'overdue':
        return t('statuses.overdue');
      case 'archived':
        return t('statuses.archived');
      default:
        return status;
    }
  };

  const startRenamingSession = (event: React.MouseEvent, session: Omit<CanvasSession, 'data'>) => {
    event.stopPropagation();
    setEditingSessionId(session.id);
    setRenameValue(getSessionDisplayName(session));
  };

  const cancelRenamingSession = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    setEditingSessionId(null);
    setRenameValue('');
  };

  const submitRename = async (sessionId: string) => {
    if (renaming) return;

    const nextName = renameValue.trim();
    if (!nextName) {
      toast.error(t('errors.emptySessionName'));
      return;
    }

    try {
      setRenaming(true);
      const response = await fetch(`/api/sessions/${sessionId}/rename`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: nextName }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || t('errors.renameSession'));
      }

      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                name: data.session?.name ?? nextName,
                updated_at: data.session?.updated_at ?? new Date().toISOString(),
              }
            : session
        )
      );
      toast.success(t('toasts.renamed'));
      setEditingSessionId(null);
      setRenameValue('');
    } catch (error) {
      console.error('Error renaming session:', error);
      toast.error(error instanceof Error ? error.message : t('errors.renameSession'));
    } finally {
      setRenaming(false);
    }
  };

  const getParticipantDisplayName = (participant?: Profile | null, fallback?: string) => {
    return (
      participant?.full_name ||
      participant?.first_name ||
      participant?.email ||
      fallback ||
      t('participants.notAvailable')
    );
  };

  const handleRenameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, sessionId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      void submitRename(sessionId);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancelRenamingSession();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeletingSessionId(sessionId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSessionId) return;

    try {
      const response = await fetch(`/api/sessions/${deletingSessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('errors.deleteSession'));
      }

      toast.success(t('toasts.deleted'));
      setSessions((prev) => prev.filter((s) => s.id !== deletingSessionId));
      setShowDeleteDialog(false);
      setDeletingSessionId(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error(error instanceof Error ? error.message : t('errors.deleteSession'));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </div>

      <div className="mb-6">
        <Button
          onClick={handleCreateClick}
          disabled={creating || checkingPatients}
          className="w-full sm:w-auto"
        >
          {creating ? t('creatingButton') : t('createButton')}
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>{t('emptyState')}</p>
        </div>
      ) : (
        <>
         {/* {profilesLoading && (
            <div className="mb-4 flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing participant details...
            </div>
          )} */}
          <div className="space-y-5">
            {sessions.map((session) => {
              const isEditing = editingSessionId === session.id;
              const isPlayground = session.type === 'playground';
              const therapistIsCurrentUser = session.therapist_id === profile?.id;

              const therapistProfile = therapistIsCurrentUser
                ? profile
                : session.therapist_id
                  ? profileCache[session.therapist_id] || null
                  : null;

              const therapistName = therapistIsCurrentUser
                ? youLabel
                : getParticipantDisplayName(therapistProfile, t('participants.therapist'));

              const therapistEmail = therapistIsCurrentUser ? profile?.email : therapistProfile?.email;

              let patientProfile: Profile | null = null;
              if (session.patient_id) {
                if (session.patient_id === profile?.id) {
                  patientProfile = profile;
                } else if (profile?.role === 'therapist') {
                  patientProfile =
                    therapistPatientMap[session.patient_id] ??
                    profileCache[session.patient_id] ??
                    null;
                } else {
                  patientProfile = profileCache[session.patient_id] ?? null;
                }
              }

              const patientName = session.patient_id
                ? session.patient_id === profile?.id
                  ? youLabel
                  : getParticipantDisplayName(
                      patientProfile,
                      profilesLoading ? t('participants.loading') : t('participants.awaitingAssignment')
                    )
                : t('participants.noPatient');

              const patientEmail =
                session.patient_id && session.patient_id === profile?.id
                  ? profile?.email
                  : patientProfile?.email;

              return (
                <div
                  key={session.id}
                  className="cursor-pointer rounded-xl border border-stroke bg-card/60 p-5 shadow-sm transition hover:border-primary/60 hover:bg-card"
                  onClick={() => handleOpenSession(session.id)}
                >
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                      {isEditing ? (
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                          <Input
                            value={renameValue}
                            onChange={(event) => setRenameValue(event.target.value)}
                            onKeyDown={(event) => handleRenameKeyDown(event, session.id)}
                            onClick={(event) => event.stopPropagation()}
                            autoFocus
                            placeholder={t('sessionNamePlaceholder')}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={(event) => cancelRenamingSession(event)}
                              aria-label={t('aria.cancelRename')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                void submitRename(session.id);
                              }}
                              disabled={renaming}
                              aria-label={t('aria.saveSessionName')}
                            >
                              {renaming ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold leading-none">
                            {getSessionDisplayName(session)}
                          </h3>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={(event) => startRenamingSession(event, session)}
                            aria-label={t('aria.renameSession')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <Badge variant={isPlayground ? 'secondary' : 'outline'}>
                          {isPlayground ? t('types.playground') : t('types.session')}
                        </Badge>
                        <span>{t('card.updated', { date: formatDate(session.updated_at) })}</span>
                        <span aria-hidden="true">•</span>
                        <span>{t('card.status', { status: getStatusLabel(session.status) })}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-start gap-3 rounded-lg border border-stroke bg-muted/40 p-3">
                        <UserCircle2 className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('participants.therapist')}
                          </p>
                          <p className="font-medium">
                            {therapistName}
                            {therapistName === youLabel && therapistProfile?.full_name
                              ? ` (${therapistProfile.full_name})`
                              : ''}
                          </p>
                          {therapistEmail && (
                            <p className="text-xs text-muted-foreground">{therapistEmail}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border border-stroke bg-muted/40 p-3">
                        <UserCircle2 className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {isPlayground ? t('participants.playgroundMode') : t('participants.patient')}
                          </p>
                          <p className="font-medium">
                            {patientName}
                          </p>
                          {!isPlayground && patientEmail && (
                            <p className="text-xs text-muted-foreground">{patientEmail}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenSession(session.id);
                        }}
                      >
                        {t('actions.openCanvas')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={(event) => handleDeleteClick(event, session.id)}
                        className="text-destructive hover:text-destructive"
                        aria-label={t('aria.deleteSession')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Patient Selection Dialog */}
      {profile?.role === 'therapist' && profile?.id && (
        <SelectPatientDialog
          open={showPatientDialog}
          onOpenChange={setShowPatientDialog}
          therapistId={profile.id}
          onSelect={createSession}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingSessionId(null)}>
              {t('actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

