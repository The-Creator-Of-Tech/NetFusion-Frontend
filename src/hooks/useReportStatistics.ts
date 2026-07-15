/**
 * hooks/useReportStatistics.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for the reports dashboard statistics panel.
 * Loads / refreshes statistics from the store and exposes derived counters.
 */

import { useEffect, useCallback } from 'react';
import { reportsStore } from '../store/reports';

export function useReportStatistics(projectId: string) {
  const state = reportsStore.useStore();

  useEffect(() => {
    if (projectId) {
      reportsStore.loadStatistics(projectId);
    }
  }, [projectId]);

  const refresh = useCallback(() => reportsStore.loadStatistics(projectId), [projectId]);

  // If statistics haven't been fetched yet, compute them client-side from the list
  const statistics = state.statistics ?? reportsStore.computeStatistics();

  return {
    statistics,
    loading: state.loading.statistics,
    error: state.error.statistics,
    refresh,
  };
}
