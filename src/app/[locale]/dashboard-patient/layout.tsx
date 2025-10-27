'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function DashboardPatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect all dashboard-patient routes
  useRequireAuth();


  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Main content area - no sidebar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

