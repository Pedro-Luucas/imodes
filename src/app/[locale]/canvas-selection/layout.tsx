'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function CanvasSelectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect canvas-selection route
  useRequireAuth();

  return <DashboardLayout>{children}</DashboardLayout>;
}
