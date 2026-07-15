/**
 * hooks/useBackgroundRefresh.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable background refresh hook.
 *
 * Features:
 *  - Only refreshes when the browser tab is visible (Visibility API)
 *  - Pauses automatically when tab is hidden
 *  - Resumes + triggers immediate refresh when tab becomes active
 *  - Respects a configurable interval
 *
 * Usage:
 *   useBackgroundRefresh(() => store.loadData(), 30_000);
 */

import { useEffect, useRef } from 'react';

export function useBackgroundRefresh(
  refreshFn: () => void,
  intervalMs: number,
  enabled = true,
): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef(refreshFn);
  refreshRef.current = refreshFn;

  useEffect(() => {
    if (!enabled) return;

    function start() {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => {
        if (!document.hidden) {
          refreshRef.current();
        }
      }, intervalMs);
    }

    function stop() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        stop();
      } else {
        refreshRef.current(); // immediate refresh on tab focus
        start();
      }
    }

    start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs, enabled]);
}
