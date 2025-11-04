'use client';

import { useEffect } from 'react';

/**
 * Hook to set page title and meta description for client components
 * This is a workaround for Next.js App Router where metadata exports
 * don't work with 'use client' directive
 * 
 * @param title - The page title
 * @param description - The page meta description
 * 
 * @example
 * ```tsx
 * function MyPage() {
 *   usePageMetadata('My Page', 'This is my page description');
 *   return <div>My Page</div>;
 * }
 * ```
 */
export function usePageMetadata(title: string, description: string) {
  useEffect(() => {
    // Set document title
    document.title = title;

    // Get or create meta description tag
    let metaDescription = document.querySelector('meta[name="description"]');
    
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    
    metaDescription.setAttribute('content', description);

    // Cleanup: restore original title and description on unmount
    return () => {
      // Optionally restore to default title/description
      // For now, we'll just leave it as is since pages typically don't unmount
    };
  }, [title, description]);
}

