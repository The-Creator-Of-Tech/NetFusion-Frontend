import { useEffect, useCallback } from 'react';
import { workflowStore } from '../store/workflow';
import type { CreateCaseRequest, UpdateCaseRequest, AddCaseTaskRequest, AddCaseNoteRequest } from '../types/api';

export function useCaseFlows(projectId: string) {
  const state = workflowStore.useStore();

  useEffect(() => {
    if (projectId) workflowStore.loadCases(projectId);
  }, [projectId]);

  const refresh = useCallback(() => workflowStore.loadCases(projectId), [projectId]);
  const create = useCallback((payload: CreateCaseRequest) => workflowStore.createCase(projectId, payload), [projectId]);
  const update = useCallback((id: string, payload: UpdateCaseRequest) => workflowStore.updateCase(projectId, id, payload), [projectId]);
  const close = useCallback((id: string) => workflowStore.closeCase(projectId, id), [projectId]);
  const reopen = useCallback((id: string) => workflowStore.reopenCase(projectId, id), [projectId]);
  const addTask = useCallback((caseId: string, payload: AddCaseTaskRequest) => workflowStore.addCaseTask(projectId, caseId, payload), [projectId]);
  const addNote = useCallback((caseId: string, payload: AddCaseNoteRequest) => workflowStore.addCaseNote(projectId, caseId, payload), [projectId]);
  const select = useCallback((c: typeof state.selectedCase) => workflowStore.setSelectedCase(c), []);

  return {
    cases: state.cases,
    selected: state.selectedCase,
    loading: state.loading.cases,
    error: state.error.cases,
    total: state.pagination.cases.total,
    refresh,
    create,
    update,
    close,
    reopen,
    addTask,
    addNote,
    select,
  };
}
