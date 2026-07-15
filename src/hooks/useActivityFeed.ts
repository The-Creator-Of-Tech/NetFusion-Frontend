/**
 * hooks/useActivityFeed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for the Activity Feed.
 * Displays user, investigation, AI, and workflow activity.
 * Background refresh paused when tab is hidden.
 * Debounced search (400 ms).
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { activityFeedStore } from '../store/activityFeed';
import { debounce } from '../lib/debounce';
import type { ActivityFilters } from '../types/shared';

const REFRESH_INTERVAL_MS = 30_000;

export function useActivityFeed() {
  const state = activityFeedStore.useStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [searchInput, setSearchInputRaw] = useState('');

  // ─── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    activityFeedStore.loadFeed();
  }, []);

  // ─── Background refresh with Visibility API ─────────────────────────────────
  useEffect(() => {
    function startPolling() {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        if (!document.hidden) activityFeedStore.loadFeed();
      }, REFRESH_INTERVAL_MS);
    }

    function stopPolling() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        stopPolling();
      } else {
        activityFeedStore.loadFeed();
        startPolling();
      }
    }

    startPolling();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // ─── Debounced search ──────────────────────────────────────────────────────
  const debouncedSearch = useRef(
    debounce((q: string) => {
      activityFeedStore.setFilters({ search: q });
      activityFeedStore.loadFeed(true);
    }, 400),
  ).current;

  const setSearchInput = useCallback(
    (q: string) => {
      setSearchInputRaw(q);
      debouncedSearch(q);
    },
    [debouncedSearch],
  );

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  const refresh = useCallback(() => activityFeedStore.loadFeed(true), []);

  const setFilters = useCallback((f: Partial<ActivityFilters>) => {
    activityFeedStore.setFilters(f);
    activityFeedStore.loadFeed(true);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchInputRaw('');
    activityFeedStore.resetFilters();
    activityFeedStore.loadFeed(true);
  }, []);

  const setPage = useCallback((page: number) => {
    activityFeedStore.setPage(page);
    activityFeedStore.loadFeed(true);
  }, []);

  return {
    entries: state.entries,
    filtered: activityFeedStore.getFilteredEntries(),
    filters: state.filters,
    pagination: state.pagination,
    searchInput,
    setSearchInput,
    loading: state.loading,
    error: state.error,
    refresh,
    setFilters,
    resetFilters,
    setPage,
  };
}
