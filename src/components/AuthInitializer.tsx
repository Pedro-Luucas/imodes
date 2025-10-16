'use client';

import { useEffect } from 'react';
import { useAuthActions } from '@/stores/authStore';

/**
 * Component that initializes the auth state on app mount.
 * Should be placed in the root layout to run once when the app loads.
 * 
 * @example
 * ```tsx
 * // In layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AuthInitializer />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function AuthInitializer() {
  const { initialize } = useAuthActions();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return null;
}

