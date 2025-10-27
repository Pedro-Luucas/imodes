'use client';

import { useState, useEffect } from 'react';
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
import { Search, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function NoTherapistPage() {
  const router = useRouter();
  const profile = useAuthProfile();
  const therapists = useTherapists();
  const loading = useTherapistLoading();
  const error = useTherapistError();
  const { searchTherapists, clearError } = useTherapistActions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [assigning, setAssigning] = useState(false);

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

  const handleSelectTherapist = async (therapistId: string, therapistName: string) => {
    if (!profile?.id) return;

    try {
      setAssigning(true);
      
      // Send request to therapist instead of direct assignment
      const response = await fetch('/api/therapists/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ therapistId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send request');
      }
      
      toast.success(`Request sent to ${therapistName}!`, {
        description: 'You will be notified when they respond.',
      });

      // Redirect to dashboard after sending request
      setTimeout(() => {
        router.push('/dashboard-patient');
      }, 2000);
    } catch (err) {
      toast.error('Failed to send request', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setAssigning(false);
    }
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

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search therapists by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {therapists.length === 0 ? (
            <div className="col-span-full">
              <Card className="p-12 text-center">
                <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Therapists Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Try adjusting your search criteria'
                    : 'No therapists are currently available'}
                </p>
              </Card>
            </div>
          ) : (
            therapists.map((therapist) => (
              <Card key={therapist.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <Avatar className="w-20 h-20 mb-4">
                    <AvatarImage src={therapist.avatar_url} />
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
                    onClick={() => handleSelectTherapist(therapist.id, therapist.full_name)}
                    disabled={assigning}
                    className="w-full"
                  >
                    {assigning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Request...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Request Therapist
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

