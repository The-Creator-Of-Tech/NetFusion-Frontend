/**
 * hooks/useReportExport.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for exporting a report in various formats (PDF, Markdown, JSON).
 * Tracks export progress and surfaces error states.
 */

import { useCallback } from 'react';
import { reportsStore } from '../store/reports';
import type { ReportRow, ExportFormat } from '../types/reports';

export function useReportExport(projectId: string) {
  const state = reportsStore.useStore();

  const exportReport = useCallback(
    async (report: ReportRow, format: ExportFormat): Promise<void> => {
      await reportsStore.exportReport(projectId, report, format);
    },
    [projectId],
  );

  const resetExport = useCallback(() => {
    reportsStore.setExportProgress({
      format: 'pdf',
      status: 'idle',
      filename: null,
      error: null,
    });
    reportsStore.clearError('export');
  }, []);

  return {
    exportProgress: state.exportProgress,
    loading:        state.loading.export,
    error:          state.error.export,
    exportReport,
    resetExport,
  };
}
