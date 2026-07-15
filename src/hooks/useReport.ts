/**
 * hooks/useReport.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for viewing a single report in detail.
 * Selects the report by id from the store (which should already be loaded
 * via useReports) and provides the detail object.
 */

import { useEffect, useCallback } from 'react';
import { reportsStore } from '../store/reports';
import type { ReportDetail } from '../types/reports';

export function useReport(reportId: string | null) {
  const state = reportsStore.useStore();

  // If we have a reportId, try to find it in the list and populate selectedReport
  useEffect(() => {
    if (!reportId) {
      reportsStore.setSelectedReport(null);
      return;
    }
    const found = state.reports.find((r) => r.id === reportId);
    if (found) {
      // Cast to ReportDetail — aiContent will be undefined for list rows
      // but this allows detail navigation to work even without a separate endpoint.
      reportsStore.setSelectedReport(found as unknown as ReportDetail);
    }
  }, [reportId, state.reports]);

  const select = useCallback((report: ReportDetail | null) => {
    reportsStore.setSelectedReport(report);
  }, []);

  return {
    report: state.selectedReport,
    loading: state.loading.detail,
    error: state.error.detail,
    select,
  };
}
