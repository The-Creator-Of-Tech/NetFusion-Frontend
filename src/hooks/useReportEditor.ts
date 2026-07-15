/**
 * hooks/useReportEditor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook that drives the report generation / editor panel.
 * Wraps the generate flow and exposes progress, errors, and the result.
 */

import { useCallback } from 'react';
import { reportsStore } from '../store/reports';
import type { GenerateReportRequest, ReportRow } from '../types/reports';

export function useReportEditor(projectId: string) {
  const state = reportsStore.useStore();

  const generate = useCallback(
    async (
      payload: GenerateReportRequest,
    ): Promise<{ blobUrl: string; filename: string; reportRow: ReportRow }> => {
      return reportsStore.generateReport(projectId, payload);
    },
    [projectId],
  );

  const clearGenerateError = useCallback(() => {
    reportsStore.clearError('generate');
  }, []);

  return {
    loading:  state.loading.generate,
    error:    state.error.generate,
    progress: state.generateProgress,
    generate,
    clearGenerateError,
  };
}
