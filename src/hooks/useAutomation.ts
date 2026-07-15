import { useEffect, useCallback } from 'react';
import { workflowStore } from '../store/workflow';
import type { TriggerAutomationRequest } from '../types/api';

export function useAutomation(projectId: string) {
  const state = workflowStore.useStore();

  useEffect(() => {
    if (projectId) workflowStore.loadAutomations(projectId);
  }, [projectId]);

  const refresh = useCallback(() => workflowStore.loadAutomations(projectId), [projectId]);
  const trigger = useCallback((payload: TriggerAutomationRequest) => workflowStore.triggerAutomation(projectId, payload), [projectId]);
  const stop = useCallback((id: string) => workflowStore.stopAutomation(projectId, id), [projectId]);
  const retry = useCallback((id: string) => workflowStore.retryAutomation(projectId, id), [projectId]);
  const resume = useCallback((id: string) => workflowStore.resumeAutomation(projectId, id), [projectId]);
  const cancel = useCallback((id: string) => workflowStore.cancelAutomation(projectId, id), [projectId]);
  const select = useCallback((a: typeof state.selectedAutomation) => workflowStore.setSelectedAutomation(a), []);

  return {
    automations: state.automations,
    selected: state.selectedAutomation,
    loading: state.loading.automations,
    error: state.error.automations,
    total: state.pagination.automations.total,
    refresh,
    trigger,
    stop,
    retry,
    resume,
    cancel,
    select,
  };
}
