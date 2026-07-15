import { useEffect, useCallback } from 'react';
import { workflowStore } from '../store/workflow';

/**
 * Fetch and subscribe to executions for a specific playbook.
 *
 * `playbookId` comes from the URL (params), NOT from the store, so it
 * survives browser refreshes and direct navigation.
 */
export function useExecutions(projectId: string, playbookId: string) {
  const state = workflowStore.useStore();

  useEffect(() => {
    if (projectId && playbookId) {
      console.log('[useExecutions] Mount — loadExecutions projectId:', projectId, 'playbookId:', playbookId);
      workflowStore.loadExecutions(projectId, playbookId);
    }
  }, [projectId, playbookId]);

  const refresh = useCallback(() => {
    console.log('[useExecutions] refresh() — projectId:', projectId, 'playbookId:', playbookId);
    return workflowStore.loadExecutions(projectId, playbookId);
  }, [projectId, playbookId]);

  const load = useCallback((id: string) => workflowStore.loadExecution(projectId, id), [projectId]);
  const select = useCallback((e: typeof state.selectedExecution) => workflowStore.setSelectedExecution(e), []);

  return {
    executions: state.executions,
    selected: state.selectedExecution,
    loading: state.loading.executions,
    error: state.error.executions,
    total: state.pagination.executions.total,
    refresh,
    load,
    select,
  };
}
