'use client';

import { useEffect, useSyncExternalStore } from 'react';

function subscribeToClock(onTick: () => void) {
  const id = window.setInterval(onTick, 1_000);
  return () => window.clearInterval(id);
}

/** Current unix time in seconds, or null during server render and hydration. */
export function useNowSeconds(): number | null {
  return useSyncExternalStore(
    subscribeToClock,
    () => Math.floor(Date.now() / 1_000),
    () => null,
  );
}

function subscribeToMedia(query: string) {
  return (onChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  };
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeToMedia(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

export function useKeydown(handler: (event: KeyboardEvent) => void) {
  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
