'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function DashboardLayoutRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect all dashboard routes
  useRequireAuth();

  return <DashboardLayout>{children}</DashboardLayout>;
}


