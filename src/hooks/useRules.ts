import { useEffect, useCallback } from 'react';
import { workflowStore } from '../store/workflow';
import type { CreateRuleRequest, UpdateRuleRequest } from '../types/api';

export function useRules(projectId: string) {
  const state = workflowStore.useStore();

  useEffect(() => {
    if (projectId) workflowStore.loadRules(projectId);
  }, [projectId]);

  const refresh = useCallback(() => workflowStore.loadRules(projectId), [projectId]);
  const create = useCallback((payload: CreateRuleRequest) => workflowStore.createRule(projectId, payload), [projectId]);
  const update = useCallback((id: string, payload: UpdateRuleRequest) => workflowStore.updateRule(projectId, id, payload), [projectId]);
  const remove = useCallback((id: string) => workflowStore.deleteRule(projectId, id), [projectId]);
  const setEnabled = useCallback((id: string, enabled: boolean) => workflowStore.setRuleEnabled(projectId, id, enabled), [projectId]);
  const select = useCallback((r: typeof state.selectedRule) => workflowStore.setSelectedRule(r), []);

  return {
    rules: state.rules,
    selected: state.selectedRule,
    loading: state.loading.rules,
    error: state.error.rules,
    total: state.pagination.rules.total,
    refresh,
    create,
    update,
    remove,
    setEnabled,
    select,
  };
}
