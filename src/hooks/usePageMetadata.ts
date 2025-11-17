'use client';

import { useEffect, useRef } from 'react';

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
  const titleRef = useRef(title);
  const descriptionRef = useRef(description);

  // Update refs when props change
  useEffect(() => {
    titleRef.current = title;
    descriptionRef.current = description;
  }, [title, description]);

  useEffect(() => {
    // Function to update title and description
    const updateMetadata = () => {
      if (document.title !== titleRef.current) {
        document.title = titleRef.current;
      }

      // Get or create meta description tag
      let metaDescription = document.querySelector('meta[name="description"]');
      
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      
      if (metaDescription.getAttribute('content') !== descriptionRef.current) {
        metaDescription.setAttribute('content', descriptionRef.current);
      }
    };

    // Set immediately
    updateMetadata();

    // Use requestAnimationFrame to ensure it runs after Next.js metadata updates
    const rafId = requestAnimationFrame(() => {
      updateMetadata();
    });

    // Set up MutationObserver to watch for title changes
    const observer = new MutationObserver(() => {
      if (document.title !== titleRef.current) {
        document.title = titleRef.current;
      }
    });

    // Observe title element changes
    const titleElement = document.querySelector('title');
    if (titleElement) {
      observer.observe(titleElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    // Also observe the document head for any title changes
    observer.observe(document.head, {
      childList: true,
      subtree: true,
    });

    // Fallback: periodically check and update (in case Next.js overrides it)
    // Check every 500ms as a safety net
    const intervalId = setInterval(() => {
      updateMetadata();
    }, 500);

    // Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, [title, description]);
}

