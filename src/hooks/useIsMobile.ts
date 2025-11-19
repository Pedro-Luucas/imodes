import { useEffect, useMemo, useState } from 'react';

const DEFAULT_BREAKPOINT = 768;

export function useIsMobile(breakpoint: number = DEFAULT_BREAKPOINT) {
  const query = useMemo(() => `(max-width: ${breakpoint}px)`, [breakpoint]);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
    };

    // Sync immediately in case the query changed
    handleChange(mediaQueryList);

    try {
      mediaQueryList.addEventListener('change', handleChange);
      return () => mediaQueryList.removeEventListener('change', handleChange);
    } catch {
      // Safari < 14 fallback
      mediaQueryList.addListener(handleChange);
      return () => mediaQueryList.removeListener(handleChange);
    }
  }, [query]);

  return isMobile;
}


