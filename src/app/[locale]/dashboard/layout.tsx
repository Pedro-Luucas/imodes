'use client';

import { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuthProfile } from '@/stores/authStore';
import { useRouter } from '@/i18n/navigation';

export default function DashboardLayoutRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect all dashboard routes
  useRequireAuth();
  const router = useRouter();
  const profile = useAuthProfile();

  // Redirect patients away from therapist dashboard
  useEffect(() => {
    if (profile && profile.role === 'patient') {
      router.push('/dashboard-patient');
    }
  }, [profile, router]);

  return <DashboardLayout>{children}</DashboardLayout>;
}


