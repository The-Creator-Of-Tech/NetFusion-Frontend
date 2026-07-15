/**
 * hooks/useAbortController.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns an AbortController that is automatically aborted on unmount,
 * or when the dependency array changes (e.g. page/filter change).
 *
 * Usage:
 *   const { signal, abort } = useAbortController([page, filters]);
 *   useEffect(() => { fetchData(signal); }, [signal]);
 */

import { useEffect, useRef, useCallback } from 'react';

export function useAbortController(deps: unknown[] = []) {
  const controllerRef = useRef<AbortController>(new AbortController());

  // Abort previous and create fresh controller when deps change
  useEffect(() => {
    controllerRef.current.abort();
    controllerRef.current = new AbortController();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Abort on unmount
  useEffect(() => {
    return () => {
      controllerRef.current.abort();
    };
  }, []);

  const abort = useCallback(() => {
    controllerRef.current.abort();
    controllerRef.current = new AbortController();
  }, []);

  return {
    signal: controllerRef.current.signal,
    abort,
    controller: controllerRef.current,
  };
}
