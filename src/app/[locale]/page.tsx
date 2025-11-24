'use client';

import { useEffect } from 'react';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useRouter } from '@/i18n/navigation';

export default function Home() {
  usePageMetadata('Home', 'Welcome to iModes platform.');
  const router = useRouter();

  useEffect(() => {
    router.push('/auth');
  }, [router]);

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
        <button
          type="button"
          onClick={() => router.push('/auth')}
          className="mt-6 inline-flex items-center justify-center rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Not redirecting? Click here
        </button>
      </div>
    </div>
  );
}
