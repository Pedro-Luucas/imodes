import { useState } from 'react';

/**
 * Detects if the user is on a mobile/touch device.
 * Checks for coarse pointer (finger input), touch capability, and user agent.
 * This excludes touch laptops where the primary input is a mouse/trackpad.
 */
export function useIsMobile() {
  const [isMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    // Primary pointer is coarse (finger, stylus) - not a mouse/trackpad
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

    // Device has touch capability
    const hasTouchScreen = navigator.maxTouchPoints > 0;

    // Device doesn't support hover (true for touch-only devices)
    const noHover = window.matchMedia('(hover: none)').matches;

    // User agent fallback (works with DevTools device toolbar)
    const mobileUserAgent = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Consider mobile if:
    // - (coarse pointer OR no hover) AND has touch screen
    // - OR mobile user agent (fallback for DevTools and edge cases)
    return ((hasCoarsePointer || noHover) && hasTouchScreen) || mobileUserAgent;
  });

  return isMobile;
}
