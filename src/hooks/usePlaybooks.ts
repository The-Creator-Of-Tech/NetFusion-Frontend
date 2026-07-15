import { useEffect, useCallback } from 'react';
import { workflowStore } from '../store/workflow';
import type { CreatePlaybookRequest, UpdatePlaybookRequest } from '../types/api';

export function usePlaybooks(projectId: string) {
  const state = workflowStore.useStore();

  useEffect(() => {
    if (projectId) workflowStore.loadPlaybooks(projectId);
  }, [projectId]);

  const refresh = useCallback(() => workflowStore.loadPlaybooks(projectId), [projectId]);
  const create = useCallback((payload: CreatePlaybookRequest) => workflowStore.createPlaybook(projectId, payload), [projectId]);
  const update = useCallback((id: string, payload: UpdatePlaybookRequest) => {
    console.log('[usePlaybooks] update() called — id:', id, '| projectId:', projectId);
    return workflowStore.updatePlaybook(projectId, id, payload);
  }, [projectId]);
  const remove = useCallback((id: string) => workflowStore.deletePlaybook(projectId, id), [projectId]);
  const duplicate = useCallback((id: string) => workflowStore.duplicatePlaybook(projectId, id), [projectId]);
  const execute = useCallback((id: string) => workflowStore.executePlaybook(projectId, id), [projectId]);
  const setEnabled = useCallback((id: string, enabled: boolean) => workflowStore.setPlaybookEnabled(projectId, id, enabled), [projectId]);
  const archive = useCallback((id: string) => workflowStore.archivePlaybook(projectId, id), [projectId]);
  const select = useCallback((p: typeof state.selectedPlaybook) => workflowStore.setSelectedPlaybook(p), []);

  return {
    playbooks: state.playbooks,
    selected: state.selectedPlaybook,
    loading: state.loading.playbooks,
    error: state.error.playbooks,
    total: state.pagination.playbooks.total,
    refresh,
    create,
    update,
    remove,
    duplicate,
    execute,
    setEnabled,
    archive,
    select,
  };
}
