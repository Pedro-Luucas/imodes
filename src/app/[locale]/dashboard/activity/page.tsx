'use client';

import { usePageMetadata } from '@/hooks/usePageMetadata';

export default function ActivityPage() {
  usePageMetadata('Activity', 'View your activity and session history.');
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground mb-4">Activity</h1>
      <p className="text-muted-foreground">This page is under construction.</p>
    </div>
  );
}


