import { useEffect, useCallback } from 'react';
import { workflowStore } from '../store/workflow';

export function useWorkflowStatistics(projectId: string) {
  const state = workflowStore.useStore();

  useEffect(() => {
    if (projectId) workflowStore.loadStatistics(projectId);
  }, [projectId]);

  const refresh = useCallback(() => workflowStore.loadStatistics(projectId), [projectId]);

  return {
    statistics: state.statistics,
    loading: state.loading.statistics,
    error: state.error.statistics,
    refresh,
  };
}
