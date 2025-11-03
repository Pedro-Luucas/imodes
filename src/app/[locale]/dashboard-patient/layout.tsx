'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Header } from '@/components/dashboard/Header';

export default function DashboardPatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect all dashboard-patient routes
  useRequireAuth();

  // Empty function for menu click since there's no sidebar in patient dashboard
  const handleMenuClick = () => {
    // No sidebar in patient dashboard, so do nothing
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Main content area - no sidebar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={handleMenuClick} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

