'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Plus,
  UserPlus,
  Calendar,
  Users,
  ClipboardList,
} from 'lucide-react';
import { useAuthProfile } from '@/stores/authStore';
import type { Profile } from '@/types/auth';
import { PatientDetailsDialog } from '@/components/dashboard/PatientDetailsDialog';
import { AddPatientDialog } from '@/components/dashboard/AddPatientDialog';
import { CreateAssignmentDialog } from '@/components/dashboard/CreateAssignmentDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  const profile = useAuthProfile();
  const [patients, setPatients] = useState<ExtendedPatient[]>([]);
  const [displayedPatients, setDisplayedPatients] = useState<PatientWithAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addPatientDialogOpen, setAddPatientDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedPatientForAssignment, setSelectedPatientForAssignment] = useState<ExtendedPatient | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  //const [avatarUrls, setAvatarUrls] = useState<Record<string, string | null>>({});

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

  const handleViewPatient = (patient: ExtendedPatient) => {
    setSelectedPatient(patient);
    setDialogOpen(true);
  };

  const handleSchedule = (patientId: string) => {
    console.log('Schedule session for patient:', patientId);
    // TODO: Implement scheduling logic
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
    return (
      <div className="flex flex-col gap-6 pt-8 pb-16 px-40">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between px-6 py-1">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-muted animate-pulse rounded-lg" />
            <div className="h-10 w-40 bg-muted animate-pulse rounded-lg" />
            <div className="h-10 w-32 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 px-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border border-input rounded-2xl p-6">
              <div className="flex flex-col gap-4">
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                <div className="h-10 w-16 bg-muted animate-pulse rounded" />
                <div className="h-4 w-28 bg-muted animate-pulse rounded" />
              </div>
            </Card>
          ))}
        </div>

        {/* Assignments Section Skeleton */}
        <div className="px-6">
          <div className="h-7 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border border-input rounded-2xl p-4">
                <div className="flex flex-col gap-4">
                  {/* Patient Header Skeleton */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-muted animate-pulse rounded-lg" />
                      <div className="flex flex-col gap-2">
                        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="h-8 w-16 bg-muted animate-pulse rounded-lg" />
                  </div>

                  {/* Patient Stats Skeleton */}
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between py-2.5 border-b border-input">
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-8 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-input">
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-input">
                      <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                    </div>
                  </div>

                  {/* Action Buttons Skeleton */}
                  <div className="flex gap-2">
                    <div className="flex-1 h-10 bg-muted animate-pulse rounded-lg" />
                    <div className="flex-1 h-10 bg-muted animate-pulse rounded-lg" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 pt-8 pb-16 px-40">
        {/* Page Title & Actions */}
        <div className="flex items-center justify-between px-6 py-1">
          <h1 className="text-2xl font-semibold text-foreground">
            Patient Management
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="default">
              <Download className="w-5 h-5" />
              Export
            </Button>
            <Button variant="secondary" size="default">
              <Plus className="w-5 h-5" />
              Start new session
            </Button>
            <Button
              variant="default"
              size="default"
              onClick={() => setAddPatientDialogOpen(true)}
            >
              <UserPlus className="w-5 h-5" />
              Add patient
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 px-6">
          <Card className="border border-input rounded-2xl p-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-base font-medium text-foreground">
                Total Patients
              </h3>
              <p className="text-4xl font-bold text-primary leading-5">
                {stats.totalPatients}
              </p>
              <p className="text-xs text-muted-foreground">
                +2 from last month
              </p>
            </div>
          </Card>

          <Card className="border border-input rounded-2xl p-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-base font-medium text-foreground">
                Active Sessions
              </h3>
              <p className="text-4xl font-bold text-primary leading-5">
                {stats.activeSessions}
              </p>
              <p className="text-xs text-muted-foreground">
                3 scheduled today
              </p>
            </div>
          </Card>

          <Card className="border border-input rounded-2xl p-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-base font-medium text-foreground">
                Completed Sessions
              </h3>
              <p className="text-4xl font-bold text-primary leading-5">
                {stats.completedSessions}
              </p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
          </Card>

          <Card className="border border-input rounded-2xl p-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-base font-medium text-foreground">
                Pending Assignments
              </h3>
              <p className="text-4xl font-bold text-primary leading-5">
                {stats.pendingAssignments}
              </p>
              <p className="text-xs text-muted-foreground">2 due today</p>
            </div>
          </Card>
        </div>

        {/* Assignments Section */}
        <div className="px-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Assignments
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {displayedPatients.slice(0, 4).map((patient, index) => (
              <Card
                key={`assignment-${patient.id}-${index}`}
                className="border border-input rounded-2xl p-4"
              >
                <div className="flex flex-col gap-4">
                  {/* Patient Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10">
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

                      <div className="flex flex-col gap-2">
                        <h3 className="text-base font-medium text-foreground">
                          {patient.full_name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Member since{' '}
                            {new Date(patient.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-50 text-green-600 border-transparent px-4 h-8 rounded-lg font-semibold">
                      Active
                    </Badge>
                  </div>

                  {/* Patient Stats */}
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between py-2.5 border-b border-input">
                      <span className="text-sm text-foreground">Sessions</span>
                      <span className="text-sm text-foreground">
                        {patient.sessions}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-input">
                      <span className="text-sm text-foreground">
                        Last Session
                      </span>
                      <span className="text-sm text-foreground">
                        {patient.lastSession}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-input">
                      <span className="text-sm text-foreground">Progress</span>
                      <span className="text-sm text-foreground">
                        {patient.progress}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1 h-10"
                      onClick={() => handleSchedule(patient.id)}
                    >
                      Schedule
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 h-10"
                      onClick={() => handleCreateAssignment(patient)}
                    >
                      <ClipboardList className="w-4 h-4" />
                      Assignment
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 h-10"
                      onClick={() => handleViewPatient(patient)}
                    >
                      View
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
              Loading more patients...
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
            All patients loaded
          </div>
        )}

        {/* No Patients Message */}
        {displayedPatients.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No patients found
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start by adding your first patient
            </p>
            <Button variant="default">
              <UserPlus className="w-5 h-5" />
              Add patient
            </Button>
          </div>
        )}
      </div>

      {/* Patient Details Dialog */}
      <PatientDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={selectedPatient}
        onSchedule={handleSchedule}
      />

      {/* Add Patient Dialog */}
      {profile?.id && (
        <AddPatientDialog
          open={addPatientDialogOpen}
          onOpenChange={setAddPatientDialogOpen}
          therapistId={profile.id}
          onPatientAdded={fetchPatients}
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
    </>
  );
}
