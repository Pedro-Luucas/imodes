'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useRouter } from '@/i18n/navigation';
import { useAuthProfile } from '@/stores/authStore';
import {
  useTherapists,
  useTherapistLoading,
  useTherapistError,
  useTherapistActions,
} from '@/stores/therapistStore';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import type { Profile } from '@/types/auth';
import { Search, UserPlus, Loader2, AlertCircle, Copy, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function NoTherapistPage() {
  usePageMetadata('Find Your Therapist', 'Browse and select a therapist to begin your therapy journey.');
  const router = useRouter();
  const profile = useAuthProfile();
  const therapists = useTherapists();
  const loading = useTherapistLoading();
  const error = useTherapistError();
  const { searchTherapists, clearError } = useTherapistActions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [hasTherapist, setHasTherapist] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const [therapistToConfirm, setTherapistToConfirm] = useState<Profile | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState<Profile | null>(null);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [requestingTherapistId, setRequestingTherapistId] = useState<string | null>(null);
  const [therapistAvatarUrls, setTherapistAvatarUrls] = useState<Record<string, string>>({});
  const [selectedTherapistAvatarUrl, setSelectedTherapistAvatarUrl] = useState<string | null>(null);
  const [checkingTherapist, setCheckingTherapist] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(therapists.length / pageSize)), [therapists.length, pageSize]);
  const paginatedTherapists = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    return therapists.slice(startIndex, startIndex + pageSize);
  }, [therapists, currentPage, totalPages, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleCopyPatientId = async () => {
    if (!profile?.id) return;

    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard not supported in this browser');
      }

      await navigator.clipboard.writeText(profile.id);
      toast.success('Patient ID copied to clipboard');
    } catch (err) {
      toast.error('Unable to copy ID', {
        description:
          err instanceof Error ? err.message : 'Please copy it manually',
      });
    }
  };

  // Check if patient has a therapist
  const checkPatientTherapist = useCallback(async () => {
    if (!profile?.id) return null;
    
    try {
      const response = await fetch(`/api/patients/${profile.id}/therapist`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.therapist;
    } catch (error) {
      console.error('Error checking therapist:', error);
      return null;
    }
  }, [profile?.id]);

  // Initial check for therapist
  useEffect(() => {
    if (!profile?.id) return;
    
    const check = async () => {
      setCheckingTherapist(true);
      const therapist = await checkPatientTherapist();
      setHasTherapist(!!therapist);
      setCheckingTherapist(false);
    };
    
    check();
  }, [profile?.id, checkPatientTherapist]);

  // Initial load
  useEffect(() => {
    searchTherapists();
  }, [searchTherapists]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchTherapists(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchTherapists]);

  // Fetch signed avatar URLs for therapists
  useEffect(() => {
    const fetchAvatarUrls = async () => {
      const urls: Record<string, string> = {};
      
      for (const therapist of therapists) {
        if (therapist.avatar_url) {
          try {
            const response = await fetch(`/api/profile/avatar/url/${therapist.id}`);
            if (response.ok) {
              const data = await response.json();
              if (data.signed_url) {
                urls[therapist.id] = data.signed_url;
              }
            }
          } catch (error) {
            console.error(`Error fetching avatar for therapist ${therapist.id}:`, error);
          }
        }
      }
      
      setTherapistAvatarUrls(urls);
    };

    if (therapists.length > 0) {
      fetchAvatarUrls();
    }
  }, [therapists]);

  // Fetch signed avatar URL for selected therapist
  useEffect(() => {
    const fetchSelectedAvatar = async () => {
      if (selectedTherapist?.avatar_url) {
        try {
          const response = await fetch(`/api/profile/avatar/url/${selectedTherapist.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.signed_url) {
              setSelectedTherapistAvatarUrl(data.signed_url);
            }
          }
        } catch (error) {
          console.error('Error fetching selected therapist avatar:', error);
        }
      } else {
        setSelectedTherapistAvatarUrl(null);
      }
    };

    if (selectedTherapist) {
      fetchSelectedAvatar();
    }
  }, [selectedTherapist]);

  // Poll for therapist acceptance when waiting
  useEffect(() => {
    if (!waitingForApproval || !profile?.id) {
      return;
    }

    const interval = setInterval(async () => {
      const therapist = await checkPatientTherapist();
      if (therapist) {
        // Therapist accepted, redirect immediately
        router.push('/dashboard-patient');
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [waitingForApproval, profile?.id, router, checkPatientTherapist]);

  const handleConfirmTherapist = async () => {
    if (!profile?.id || !therapistToConfirm) return;

    try {
      setAssigning(true);
      setRequestingTherapistId(therapistToConfirm.id);
      
      // Send request to therapist instead of direct assignment
      const response = await fetch('/api/therapists/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ therapistId: therapistToConfirm.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send request');
      }
      
      toast.success(`Request sent to ${therapistToConfirm.full_name}!`, {
        description: 'We will notify you when they respond.',
      });

      setSelectedTherapist(therapistToConfirm);
      setWaitingForApproval(true);
      setShowConfirmDialog(false);
    } catch (err) {
      toast.error('Failed to send request', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setAssigning(false);
      setRequestingTherapistId(null);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setShowConfirmDialog(open);
    if (!open) {
      setTherapistToConfirm(null);
    }
  };


  const handleTherapistSelection = (therapist: Profile) => {
    setTherapistToConfirm(therapist);
    setShowConfirmDialog(true);
  };

  const handleReturnToDashboard = () => {
    router.push('/dashboard-patient');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!profile || profile.role !== 'patient') {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This page is only accessible to patients.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (checkingTherapist) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Find Your Therapist
        </h1>
        <p className="text-muted-foreground">
          Select a therapist from the list below to get started with your therapy journey.
        </p>
      </div>

      {hasTherapist && !waitingForApproval ? (
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            <AlertCircle className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                You already have a therapist
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You can manage your sessions and communicate with your therapist from your dashboard.
              </p>
              <Button onClick={handleReturnToDashboard} className="mt-4">
                Go to dashboard
              </Button>
            </div>
          </div>
        </Card>
      ) : selectedTherapist ? (
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left">
            <Avatar className="h-24 w-24">
              <AvatarImage src={selectedTherapistAvatarUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {getInitials(selectedTherapist.full_name || selectedTherapist.first_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                {selectedTherapist.full_name}
              </h2>
              <p className="text-sm text-muted-foreground">{selectedTherapist.email}</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
                <Clock className="h-4 w-4" />
                Waiting for your therapist to accept your request...
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                We are checking every few seconds. As soon as they accept, you will be redirected to your dashboard.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search therapists by name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Share Patient ID */}
          <div className="mb-8 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">
              Can&apos;t find your therapist?
            </h2>
            <p className="text-sm text-muted-foreground">
              Or send your therapist your patient ID so they can connect with you directly.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Your ID:</span>
              <Button
                variant="link"
                className="px-0 font-semibold text-primary hover:underline"
                onClick={handleCopyPatientId}
              >
                <Copy className="mr-2 h-4 w-4" />
                {profile.id}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </Alert>
          )}

          {/* Loading State */}
          {loading && !assigning && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Therapist List */}
          {!loading && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {therapists.length === 0 ? (
                  <div className="col-span-full">
                    <Card className="p-12 text-center">
                      <UserPlus className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Therapists Found</h3>
                      <p className="text-muted-foreground">
                        {searchTerm
                          ? 'Try adjusting your search criteria'
                          : 'No therapists are currently available'}
                      </p>
                    </Card>
                  </div>
                ) : (
                  paginatedTherapists.map((therapist) => (
                    <Card key={therapist.id} className="p-6 transition-shadow hover:shadow-lg">
                      <div className="flex flex-col items-center text-center">
                        {/* Avatar */}
                        <Avatar className="mb-4 h-20 w-20">
                          <AvatarImage src={therapistAvatarUrls[therapist.id] || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                            {getInitials(therapist.full_name || therapist.first_name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {therapist.full_name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {therapist.email}
                        </p>

                        {/* Action Button */}
                        <Button
                          onClick={() => handleTherapistSelection(therapist)}
                          disabled={assigning}
                          className="w-full"
                        >
                          {assigning && requestingTherapistId === therapist.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending Request...
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Request Therapist
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {therapists.length > pageSize && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {Math.min(currentPage, totalPages)} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={handleDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Therapist</AlertDialogTitle>
            <AlertDialogDescription>
              {therapistToConfirm
                ? `Are you sure you want to send a request to ${therapistToConfirm.full_name}?`
                : 'Are you sure you want to send this request?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={assigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTherapist} disabled={assigning}>
              {assigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Request...
                </>
              ) : (
                'Confirm Request'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

