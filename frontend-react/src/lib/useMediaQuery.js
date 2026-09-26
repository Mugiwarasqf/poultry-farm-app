import { useEffect, useState } from 'react';

/**
 * Tracks a CSS media query from JS.
 *
 * History needs this because the desktop/mobile split isn't purely visual:
 * on a wide screen clicking a batch opens a side panel, on a narrow one it
 * navigates to /history/:batchId. That's a behaviour difference, so a CSS
 * breakpoint alone can't express it.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Tailwind's `lg` breakpoint — where History switches to the side panel. */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}
