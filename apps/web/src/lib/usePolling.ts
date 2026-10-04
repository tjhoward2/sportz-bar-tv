'use client';

import { useEffect, useRef } from 'react';

/**
 * Calls `tick` every `intervalMs` while the tab is visible, and right away
 * when it becomes visible again (Page Visibility API). Matches the 30s
 * server cache, so polling never asks for data that can't have changed.
 */
export function usePolling(tick: () => void, intervalMs = 30_000): void {
  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      stop();
      timer = setInterval(() => tickRef.current(), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tickRef.current();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
}
