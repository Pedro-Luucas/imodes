'use client';

import { useEffect } from 'react';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { useRouter } from '@/i18n/navigation';

export default function Home() {
  usePageMetadata('Home', 'Welcome to iModes platform.');
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to login...</p>
      </div>
    </div>
  );
}
