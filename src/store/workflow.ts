import { Store } from './base';
import * as Types from '../types/api';
import { request } from '../api/request';
import { Endpoints } from '../api/endpoints';

// ─── Priority mapping ─────────────────────────────────────────────────────────
// FastAPI expects priority as an integer; the UI stores it as a label string.
// Map here, at the request-building boundary, so the proxy stays a transparent
// forwarder and the entire UI/component layer keeps using string labels.

const PRIORITY_TO_INT: Record<Types.PlaybookPriority, number> = {
  critical: 4,
  high:     3,
  medium:   2,
  low:      1,
};

const FRONTEND_TO_BACKEND_STEP_TYPE: Record<string, string> = {
  detection: 'verification',
  investigation: 'manual',
  notification: 'manual',
  containment: 'containment',
  eradication: 'eradication',
  recovery: 'recovery',
  manual: 'manual',
  automated: 'automated',
};

const BACKEND_TO_FRONTEND_STEP_TYPE: Record<string, string> = {
  verification: 'detection',
  manual: 'manual',
  containment: 'containment',
  eradication: 'eradication',
  recovery: 'recovery',
  automated: 'automated',
};

function serializePlaybookPriority<T extends { priority?: Types.PlaybookPriority }>(
  payload: T,
): Omit<T, 'priority'> & { priority?: number } {
  if (payload.priority === undefined) return payload as Omit<T, 'priority'> & { priority?: number };
  const { priority, ...rest } = payload;
  return { ...rest, priority: PRIORITY_TO_INT[priority] };
}

// ─── Step serialization ───────────────────────────────────────────────────────
// FastAPI PlaybookStep schema uses different field names than the frontend model:
//   Frontend          →  Backend
//   ──────────────────────────────
//   id                →  id (preserved)
//   name              →  title
//   type              →  stepType
//   order             →  stepNumber
//   description       →  description (preserved)
//   expectedOutcome   →  expectedOutcome (preserved)
//   relatedCves       →  relatedCVEs
//   relatedMitre      →  relatedTechniques
//   relatedIocs       →  relatedIOCs
//   config            →  config (preserved)
//   onSuccess         →  onSuccess (preserved)
//   onFailure         →  onFailure (preserved)
//   timeout           →  timeout (preserved)
//   (generated)       →  createdAt

function serializePlaybookStep(step: Types.PlaybookStep): Record<string, unknown> {
  const { id, name, type, order, description, expectedOutcome, relatedCves, relatedMitre, relatedIocs, config, onSuccess, onFailure, timeout } = step;
  const backendType = FRONTEND_TO_BACKEND_STEP_TYPE[type] || 'manual';
  return {
    id,
    title:       name,
    stepType:    backendType,
    stepNumber:  order + 1,
    description: description || '',
    expectedOutcome: expectedOutcome || '',
    relatedCVEs: relatedCves || [],
    relatedTechniques: relatedMitre || [],
    relatedIOCs: relatedIocs || [],
    config,
    onSuccess,
    onFailure,
    timeout,
    createdAt:   new Date().toISOString(),
  };
}

function serializeSteps<T extends { steps?: Types.PlaybookStep[] }>(
  payload: T,
): Omit<T, 'steps'> & { steps?: Record<string, unknown>[] } {
  if (!payload.steps) return payload as Omit<T, 'steps'> & { steps?: Record<string, unknown>[] };
  const { steps, ...rest } = payload;
  return { ...rest, steps: steps.map(serializePlaybookStep) };
}

function deserializePlaybookStep(step: any): Types.PlaybookStep {
  const rawType = (step.stepType || 'manual').toLowerCase();
  const frontendType = BACKEND_TO_FRONTEND_STEP_TYPE[rawType] || 'manual';
  return {
    id: step.stepId || step.id,
    name: step.title || '',
    type: frontendType as Types.StepType,
    order: typeof step.stepNumber === 'number' ? Math.max(0, step.stepNumber - 1) : 0,
    description: step.description || '',
    expectedOutcome: step.expectedOutcome || '',
    relatedCves: step.relatedCVEs || [],
    relatedMitre: step.relatedTechniques || [],
    relatedIocs: step.relatedIOCs || [],
    config: step.config || {},
    onSuccess: step.onSuccess || '',
    onFailure: step.onFailure || '',
    timeout: step.timeout,
  };
}

function deserializePlaybook(p: any): Types.Playbook {
  const INT_TO_PRIORITY: Record<number, Types.PlaybookPriority> = {
    4: 'critical',
    3: 'high',
    2: 'medium',
    1: 'low',
  };
  const rawPriority = typeof p.priority === 'number' ? p.priority : 2;
  const mappedPriority = INT_TO_PRIORITY[rawPriority] || 'medium';

  return {
    ...p,
    id: p.id || p.playbookId,
    priority: mappedPriority,
    steps: Array.isArray(p.steps) ? p.steps.map(deserializePlaybookStep) : [],
    stepCount: Array.isArray(p.steps) ? p.steps.length : (p.stepCount || 0),
  };
}

// ─── State Shape ──────────────────────────────────────────────────────────────

export interface WorkflowState {
  // Playbooks
  playbooks: Types.Playbook[];
  selectedPlaybook: Types.Playbook | null;

  // Rules
  rules: Types.Rule[];
  selectedRule: Types.Rule | null;

  // Automations
  automations: Types.Automation[];
  selectedAutomation: Types.Automation | null;

  // Cases
  cases: Types.CaseFlow[];
  selectedCase: Types.CaseFlow | null;

  // Executions
  executions: Types.WorkflowExecution[];
  selectedExecution: Types.WorkflowExecution | null;

  // Statistics
  statistics: Types.WorkflowStatistics | null;

  // Pagination
  pagination: {
    playbooks: { page: number; total: number };
    rules: { page: number; total: number };
    automations: { page: number; total: number };
    cases: { page: number; total: number };
    executions: { page: number; total: number };
  };

  // Loading per section
  loading: {
    playbooks: boolean;
    rules: boolean;
    automations: boolean;
    cases: boolean;
    executions: boolean;
    statistics: boolean;
  };

  // Error per section
  error: {
    playbooks: string | null;
    rules: string | null;
    automations: string | null;
    cases: string | null;
    executions: string | null;
    statistics: string | null;
  };
}

const initialState: WorkflowState = {
  playbooks: [],
  selectedPlaybook: null,
  rules: [],
  selectedRule: null,
  automations: [],
  selectedAutomation: null,
  cases: [],
  selectedCase: null,
  executions: [],
  selectedExecution: null,
  statistics: null,
  pagination: {
    playbooks: { page: 1, total: 0 },
    rules: { page: 1, total: 0 },
    automations: { page: 1, total: 0 },
    cases: { page: 1, total: 0 },
    executions: { page: 1, total: 0 },
  },
  loading: {
    playbooks: false,
    rules: false,
    automations: false,
    cases: false,
    executions: false,
    statistics: false,
  },
  error: {
    playbooks: null,
    rules: null,
    automations: null,
    cases: null,
    executions: null,
    statistics: null,
  },
};

// ─── Store Class ──────────────────────────────────────────────────────────────

export class WorkflowStore extends Store<WorkflowState> {
  constructor() {
    super(initialState);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private setLoading(section: keyof WorkflowState['loading'], value: boolean): void {
    this.setState((s) => ({ loading: { ...s.loading, [section]: value } }));
  }

  private setError(section: keyof WorkflowState['error'], msg: string | null): void {
    this.setState((s) => ({ error: { ...s.error, [section]: msg } }));
  }

  private setTotal(section: keyof WorkflowState['pagination'], total: number): void {
    this.setState((s) => ({
      pagination: { ...s.pagination, [section]: { ...s.pagination[section], total } },
    }));
  }

  // ─── Playbook Setters ─────────────────────────────────────────────────────────

  setPlaybooks(playbooks: Types.Playbook[]): void { this.setState({ playbooks }); }
  setSelectedPlaybook(p: Types.Playbook | null): void { this.setState({ selectedPlaybook: p }); }
  addPlaybook(p: Types.Playbook): void {
    this.setState((s) => ({ playbooks: [p, ...s.playbooks] }));
  }
  updatePlaybookInState(p: Types.Playbook): void {
    this.setState((s) => ({ playbooks: s.playbooks.map((x) => (x.id === p.id ? p : x)) }));
  }
  removePlaybook(id: string): void {
    this.setState((s) => ({ playbooks: s.playbooks.filter((x) => x.id !== id) }));
  }

  // ─── Rule Setters ─────────────────────────────────────────────────────────────

  setRules(rules: Types.Rule[]): void { this.setState({ rules }); }
  setSelectedRule(r: Types.Rule | null): void { this.setState({ selectedRule: r }); }
  addRule(r: Types.Rule): void {
    this.setState((s) => ({ rules: [r, ...s.rules] }));
  }
  updateRuleInState(r: Types.Rule): void {
    this.setState((s) => ({ rules: s.rules.map((x) => (x.id === r.id ? r : x)) }));
  }
  removeRule(id: string): void {
    this.setState((s) => ({ rules: s.rules.filter((x) => x.id !== id) }));
  }

  // ─── Automation Setters ───────────────────────────────────────────────────────

  setAutomations(automations: Types.Automation[]): void { this.setState({ automations }); }
  setSelectedAutomation(a: Types.Automation | null): void { this.setState({ selectedAutomation: a }); }
  addAutomation(a: Types.Automation): void {
    this.setState((s) => ({ automations: [a, ...s.automations] }));
  }
  updateAutomationInState(a: Types.Automation): void {
    this.setState((s) => ({ automations: s.automations.map((x) => (x.id === a.id ? a : x)) }));
  }

  // ─── Case Setters ─────────────────────────────────────────────────────────────

  setCases(cases: Types.CaseFlow[]): void { this.setState({ cases }); }
  setSelectedCase(c: Types.CaseFlow | null): void { this.setState({ selectedCase: c }); }
  addCase(c: Types.CaseFlow): void {
    this.setState((s) => ({ cases: [c, ...s.cases] }));
  }
  updateCaseInState(c: Types.CaseFlow): void {
    this.setState((s) => ({ cases: s.cases.map((x) => (x.id === c.id ? c : x)) }));
  }
  removeCase(id: string): void {
    this.setState((s) => ({ cases: s.cases.filter((x) => x.id !== id) }));
  }

  // ─── Execution Setters ───────────────────────────────────────────────────────

  setExecutions(executions: Types.WorkflowExecution[]): void {
    console.log('[WorkflowStore] setExecutions called — length=' + executions.length, executions.map(e => e.id));
    this.setState({ executions });
  }
  setSelectedExecution(e: Types.WorkflowExecution | null): void { this.setState({ selectedExecution: e }); }
  updateExecutionInState(e: Types.WorkflowExecution): void {
    this.setState((s) => ({ executions: s.executions.map((x) => (x.id === e.id ? e : x)) }));
  }

  // ─── Statistics Setter ───────────────────────────────────────────────────────

  setStatistics(statistics: Types.WorkflowStatistics | null): void { this.setState({ statistics }); }

  // ─── Async: Playbooks ─────────────────────────────────────────────────────────

  async loadPlaybooks(projectId: string): Promise<void> {
    this.setLoading('playbooks', true);
    this.setError('playbooks', null);
    try {
      const res = await request.get<{
        success: boolean;
        message: string;
        data: Types.Playbook[];
        metadata?: { pagination?: { totalItems?: number } };
      }>(Endpoints.workflow.playbooks.list(projectId));
      const raw = res.data ?? (res as any).playbooks ?? [];
      const playbooks = raw.map(deserializePlaybook);
      const total = res.metadata?.pagination?.totalItems ?? playbooks.length;
      this.setPlaybooks(playbooks);
      this.setTotal('playbooks', total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load playbooks';
      this.setError('playbooks', msg);
    } finally {
      this.setLoading('playbooks', false);
    }
  }

  async loadPlaybook(projectId: string, playbookId: string): Promise<void> {
    this.setLoading('playbooks', true);
    this.setError('playbooks', null);
    try {
      const p = await request.get<any>(
        Endpoints.workflow.playbooks.get(projectId, playbookId)
      );
      this.setState({ selectedPlaybook: deserializePlaybook(p) });
    } catch (err: unknown) {
      this.setError('playbooks', err instanceof Error ? err.message : 'Failed to load playbook');
    } finally {
      this.setLoading('playbooks', false);
    }
  }

  async createPlaybook(projectId: string, payload: Types.CreatePlaybookRequest): Promise<Types.Playbook> {
    this.setLoading('playbooks', true);
    this.setError('playbooks', null);
    try {
      // Map priority label → severity string that the FastAPI PlaybookRequest requires
      const PRIORITY_TO_SEVERITY: Record<Types.PlaybookPriority, string> = {
        critical: 'CRITICAL',
        high:     'HIGH',
        medium:   'MEDIUM',
        low:      'LOW',
      };
      const enrichedPayload = {
        ...serializeSteps(serializePlaybookPriority(payload)),
        projectId,
        severity:  PRIORITY_TO_SEVERITY[payload.priority] ?? 'MEDIUM',
        status:    'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      console.log("PLAYBOOK CREATE PAYLOAD", enrichedPayload);
      const p = await request.post<any>(
        Endpoints.workflow.playbooks.create(projectId), enrichedPayload
      );
      const deserialized = deserializePlaybook(p);
      this.addPlaybook(deserialized);
      return deserialized;
    } catch (err: unknown) {
      this.setError('playbooks', err instanceof Error ? err.message : 'Failed to create playbook');
      throw err;
    } finally {
      this.setLoading('playbooks', false);
    }
  }

  async updatePlaybook(projectId: string, playbookId: string, payload: Types.UpdatePlaybookRequest): Promise<Types.Playbook> {
    console.log('[workflowStore] updatePlaybook() called — projectId:', projectId, '| playbookId:', playbookId);
    console.log('[workflowStore] updatePlaybook payload:', JSON.stringify(payload));
    this.setError('playbooks', null);
    try {
      const url = Endpoints.workflow.playbooks.update(projectId, playbookId);
      console.log('[workflowStore] PUT URL about to be sent:', url);
      const p = await request.put<any>(
        url, serializeSteps(serializePlaybookPriority(payload))
      );
      const deserialized = deserializePlaybook(p);
      this.updatePlaybookInState(deserialized);
      return deserialized;
    } catch (err: unknown) {
      this.setError('playbooks', err instanceof Error ? err.message : 'Failed to update playbook');
      throw err;
    }
  }

  async deletePlaybook(projectId: string, playbookId: string): Promise<void> {
    this.setError('playbooks', null);
    try {
      await request.delete<void>(Endpoints.workflow.playbooks.delete(projectId, playbookId));
      this.removePlaybook(playbookId);
    } catch (err: unknown) {
      this.setError('playbooks', err instanceof Error ? err.message : 'Failed to delete playbook');
      throw err;
    }
  }

  async duplicatePlaybook(projectId: string, playbookId: string): Promise<Types.Playbook> {
    this.setError('playbooks', null);
    try {
      const p = await request.post<any>(
        Endpoints.workflow.playbooks.duplicate(projectId, playbookId), {}
      );
      const deserialized = deserializePlaybook(p);
      this.addPlaybook(deserialized);
      return deserialized;
    } catch (err: unknown) {
      this.setError('playbooks', err instanceof Error ? err.message : 'Failed to duplicate playbook');
      throw err;
    }
  }

  async executePlaybook(projectId: string, playbookId: string): Promise<Types.Automation> {
    this.setError('automations', null);
    try {
      const url = Endpoints.workflow.playbooks.execute(projectId, playbookId);
      console.log('[WorkflowStore] [1] Execute button fired — POST', url);
      const a = await request.post<Types.Automation>(url, {});
      console.log('[WorkflowStore] [2] POST /execute response:', JSON.stringify(a));

      this.addAutomation(a);
      console.log('[WorkflowStore] [3] addAutomation() called — automation added to store');

      // Mirror the new execution into the executions list so the Execution
      // Monitor picks it up immediately without waiting for a full reload.
      const execution: Types.WorkflowExecution = {
        id:          a.id,
        type:        'playbook',
        name:        a.name,
        refId:       playbookId,
        status:      a.status,
        startedAt:   a.startedAt,
        triggeredBy: a.triggeredByName ?? a.triggeredBy,
        logs:        a.logs ?? [],
        progress:    a.progress ?? 0,
        projectId,
        createdAt:   a.createdAt,
      };
      console.log('[WorkflowStore] [4] Injecting WorkflowExecution into store.executions:', JSON.stringify(execution));
      this.setState((s) => {
        const next = [execution, ...s.executions];
        console.log('[WorkflowStore] [5] store.executions updated — new length=' + next.length, next.map(e => e.id));
        return { executions: next };
      });
      console.log('[WorkflowStore] [6] setState complete — Execution Monitor should re-render');

      return a;
    } catch (err: unknown) {
      console.error('[WorkflowStore] executePlaybook error:', err);
      this.setError('automations', err instanceof Error ? err.message : 'Failed to execute playbook');
      throw err;
    }
  }

  async setPlaybookEnabled(projectId: string, playbookId: string, enabled: boolean): Promise<void> {
    this.setError('playbooks', null);
    try {
      const url = enabled
        ? Endpoints.workflow.playbooks.enable(projectId, playbookId)
        : Endpoints.workflow.playbooks.disable(projectId, playbookId);
      const p = await request.post<any>(url, {});
      this.updatePlaybookInState(deserializePlaybook(p));
    } catch (err: unknown) {
      this.setError('playbooks', err instanceof Error ? err.message : 'Failed to toggle playbook');
      throw err;
    }
  }

  async archivePlaybook(projectId: string, playbookId: string): Promise<void> {
    this.setError('playbooks', null);
    try {
      const p = await request.post<any>(
        Endpoints.workflow.playbooks.archive(projectId, playbookId), {}
      );
      this.updatePlaybookInState(deserializePlaybook(p));
    } catch (err: unknown) {
      this.setError('playbooks', err instanceof Error ? err.message : 'Failed to archive playbook');
      throw err;
    }
  }

  // ─── Async: Rules ─────────────────────────────────────────────────────────────

  async loadRules(projectId: string): Promise<void> {
    this.setLoading('rules', true);
    this.setError('rules', null);
    try {
      const res = await request.get<{ rules: Types.Rule[]; total: number }>(
        Endpoints.workflow.rules.list(projectId)
      );
      this.setRules(res.rules ?? []);
      this.setTotal('rules', res.total ?? res.rules?.length ?? 0);
    } catch (err: unknown) {
      this.setError('rules', err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      this.setLoading('rules', false);
    }
  }

  async createRule(projectId: string, payload: Types.CreateRuleRequest): Promise<Types.Rule> {
    this.setLoading('rules', true);
    this.setError('rules', null);
    try {
      const r = await request.post<Types.Rule>(Endpoints.workflow.rules.create(projectId), payload);
      this.addRule(r);
      return r;
    } catch (err: unknown) {
      this.setError('rules', err instanceof Error ? err.message : 'Failed to create rule');
      throw err;
    } finally {
      this.setLoading('rules', false);
    }
  }

  async updateRule(projectId: string, ruleId: string, payload: Types.UpdateRuleRequest): Promise<Types.Rule> {
    this.setError('rules', null);
    try {
      const r = await request.patch<Types.Rule>(Endpoints.workflow.rules.update(projectId, ruleId), payload);
      this.updateRuleInState(r);
      return r;
    } catch (err: unknown) {
      this.setError('rules', err instanceof Error ? err.message : 'Failed to update rule');
      throw err;
    }
  }

  async deleteRule(projectId: string, ruleId: string): Promise<void> {
    this.setError('rules', null);
    try {
      await request.delete<void>(Endpoints.workflow.rules.delete(projectId, ruleId));
      this.removeRule(ruleId);
    } catch (err: unknown) {
      this.setError('rules', err instanceof Error ? err.message : 'Failed to delete rule');
      throw err;
    }
  }

  async setRuleEnabled(projectId: string, ruleId: string, enabled: boolean): Promise<void> {
    this.setError('rules', null);
    try {
      const url = enabled
        ? Endpoints.workflow.rules.enable(projectId, ruleId)
        : Endpoints.workflow.rules.disable(projectId, ruleId);
      const r = await request.post<Types.Rule>(url, {});
      this.updateRuleInState(r);
    } catch (err: unknown) {
      this.setError('rules', err instanceof Error ? err.message : 'Failed to toggle rule');
      throw err;
    }
  }

  // ─── Async: Automations ───────────────────────────────────────────────────────

  async loadAutomations(projectId: string): Promise<void> {
    this.setLoading('automations', true);
    this.setError('automations', null);
    try {
      const res = await request.get<{ automations: Types.Automation[]; total: number }>(
        Endpoints.workflow.automations.list(projectId)
      );
      this.setAutomations(res.automations ?? []);
      this.setTotal('automations', res.total ?? res.automations?.length ?? 0);
    } catch (err: unknown) {
      this.setError('automations', err instanceof Error ? err.message : 'Failed to load automations');
    } finally {
      this.setLoading('automations', false);
    }
  }

  async triggerAutomation(projectId: string, payload: Types.TriggerAutomationRequest): Promise<Types.Automation> {
    this.setError('automations', null);
    try {
      const a = await request.post<Types.Automation>(Endpoints.workflow.automations.trigger(projectId), payload);
      this.addAutomation(a);
      return a;
    } catch (err: unknown) {
      this.setError('automations', err instanceof Error ? err.message : 'Failed to trigger automation');
      throw err;
    }
  }

  async stopAutomation(projectId: string, automationId: string): Promise<void> {
    this.setError('automations', null);
    try {
      const a = await request.post<Types.Automation>(Endpoints.workflow.automations.stop(projectId, automationId), {});
      this.updateAutomationInState(a);
    } catch (err: unknown) {
      this.setError('automations', err instanceof Error ? err.message : 'Failed to stop automation');
      throw err;
    }
  }

  async retryAutomation(projectId: string, automationId: string): Promise<void> {
    this.setError('automations', null);
    try {
      const a = await request.post<Types.Automation>(Endpoints.workflow.automations.retry(projectId, automationId), {});
      this.updateAutomationInState(a);
    } catch (err: unknown) {
      this.setError('automations', err instanceof Error ? err.message : 'Failed to retry automation');
      throw err;
    }
  }

  async resumeAutomation(projectId: string, automationId: string): Promise<void> {
    this.setError('automations', null);
    try {
      const a = await request.post<Types.Automation>(Endpoints.workflow.automations.resume(projectId, automationId), {});
      this.updateAutomationInState(a);
    } catch (err: unknown) {
      this.setError('automations', err instanceof Error ? err.message : 'Failed to resume automation');
      throw err;
    }
  }

  async cancelAutomation(projectId: string, automationId: string): Promise<void> {
    this.setError('automations', null);
    try {
      const a = await request.post<Types.Automation>(Endpoints.workflow.automations.cancel(projectId, automationId), {});
      this.updateAutomationInState(a);
    } catch (err: unknown) {
      this.setError('automations', err instanceof Error ? err.message : 'Failed to cancel automation');
      throw err;
    }
  }

  // ─── Async: Cases ─────────────────────────────────────────────────────────────

  async loadCases(projectId: string): Promise<void> {
    this.setLoading('cases', true);
    this.setError('cases', null);
    try {
      const res = await request.get<{ cases: Types.CaseFlow[]; total: number }>(
        Endpoints.workflow.cases.list(projectId)
      );
      this.setCases(res.cases ?? []);
      this.setTotal('cases', res.total ?? res.cases?.length ?? 0);
    } catch (err: unknown) {
      this.setError('cases', err instanceof Error ? err.message : 'Failed to load cases');
    } finally {
      this.setLoading('cases', false);
    }
  }

  async loadCase(projectId: string, caseId: string): Promise<void> {
    this.setLoading('cases', true);
    this.setError('cases', null);
    try {
      const c = await request.get<Types.CaseFlow>(Endpoints.workflow.cases.get(projectId, caseId));
      this.setState({ selectedCase: c });
    } catch (err: unknown) {
      this.setError('cases', err instanceof Error ? err.message : 'Failed to load case');
    } finally {
      this.setLoading('cases', false);
    }
  }

  async createCase(projectId: string, payload: Types.CreateCaseRequest): Promise<Types.CaseFlow> {
    this.setLoading('cases', true);
    this.setError('cases', null);
    try {
      const c = await request.post<Types.CaseFlow>(Endpoints.workflow.cases.create(projectId), payload);
      this.addCase(c);
      return c;
    } catch (err: unknown) {
      this.setError('cases', err instanceof Error ? err.message : 'Failed to create case');
      throw err;
    } finally {
      this.setLoading('cases', false);
    }
  }

  async updateCase(projectId: string, caseId: string, payload: Types.UpdateCaseRequest): Promise<Types.CaseFlow> {
    this.setError('cases', null);
    try {
      const c = await request.patch<Types.CaseFlow>(Endpoints.workflow.cases.update(projectId, caseId), payload);
      this.updateCaseInState(c);
      return c;
    } catch (err: unknown) {
      this.setError('cases', err instanceof Error ? err.message : 'Failed to update case');
      throw err;
    }
  }

  async closeCase(projectId: string, caseId: string): Promise<void> {
    this.setError('cases', null);
    try {
      const c = await request.post<Types.CaseFlow>(Endpoints.workflow.cases.close(projectId, caseId), {});
      this.updateCaseInState(c);
    } catch (err: unknown) {
      this.setError('cases', err instanceof Error ? err.message : 'Failed to close case');
      throw err;
    }
  }

  async reopenCase(projectId: string, caseId: string): Promise<void> {
    this.setError('cases', null);
    try {
      const c = await request.post<Types.CaseFlow>(Endpoints.workflow.cases.reopen(projectId, caseId), {});
      this.updateCaseInState(c);
    } catch (err: unknown) {
      this.setError('cases', err instanceof Error ? err.message : 'Failed to reopen case');
      throw err;
    }
  }

  async addCaseTask(projectId: string, caseId: string, payload: Types.AddCaseTaskRequest): Promise<Types.CaseFlow> {
    this.setError('cases', null);
    try {
      const c = await request.post<Types.CaseFlow>(Endpoints.workflow.cases.tasks.create(projectId, caseId), payload);
      this.updateCaseInState(c);
      return c;
    } catch (err: unknown) {
      this.setError('cases', err instanceof Error ? err.message : 'Failed to add task');
      throw err;
    }
  }

  async addCaseNote(projectId: string, caseId: string, payload: Types.AddCaseNoteRequest): Promise<Types.CaseFlow> {
    this.setError('cases', null);
    try {
      const c = await request.post<Types.CaseFlow>(Endpoints.workflow.cases.notes.create(projectId, caseId), payload);
      this.updateCaseInState(c);
      return c;
    } catch (err: unknown) {
      this.setError('cases', err instanceof Error ? err.message : 'Failed to add note');
      throw err;
    }
  }

  // ─── Async: Executions ───────────────────────────────────────────────────────

  async loadExecutions(projectId: string, playbookId?: string): Promise<void> {
    this.setLoading('executions', true);
    this.setError('executions', null);
    try {
      const url = Endpoints.workflow.executions.list(projectId, playbookId);
      console.log('[WorkflowStore] loadExecutions — GET', url);
      const res = await request.get<any>(url);
      const raw = res.data ?? res.executions ?? [];
      const fetched: Types.WorkflowExecution[] = (Array.isArray(raw) ? raw : []).map((e: any) => ({
        ...e,
        id: e.id ?? e.executionId,
        refId: e.refId ?? e.playbookId,
        name: e.name ?? e.playbookName ?? 'Playbook Execution',
        type: e.type ?? 'playbook',
        completedAt: e.completedAt ?? e.finishedAt,
        status: (e.status ?? 'queued').toLowerCase() as any,
        // Phase 2: pass through runtime context fields
        variables: e.variables ?? {},
        artifacts: e.artifacts ?? [],
        artifactsCount: e.artifactsCount ?? (e.artifacts ? e.artifacts.length : 0),
        stepOutputs: e.stepOutputs ?? {},
        timelineEvents: e.timelineEvents ?? [],
        currentExecutor: e.currentExecutor,
        currentAction: e.currentAction,
        returnedSummary: e.returnedSummary,
      }));
      console.log('[WorkflowStore] loadExecutions — API returned', fetched.length, 'executions');

      this.setState((s) => {
        if (fetched.length === 0 && s.executions.length > 0) {
          console.log('[WorkflowStore] loadExecutions — API returned 0; preserving', s.executions.length, 'in-memory execution(s):', s.executions.map(e => e.id));
          return { loading: { ...s.loading, executions: false } };
        }
        const fetchedIds = new Set(fetched.map(e => e.id));
        const localOnly = s.executions.filter(e => !fetchedIds.has(e.id));
        const merged = [...fetched, ...localOnly];
        console.log('[WorkflowStore] loadExecutions — merged result:', merged.length, 'executions', merged.map(e => e.id));
        return { executions: merged };
      });
      const totalCount = res.total ?? (res.metadata?.pagination?.totalItems) ?? fetched.length;
      this.setTotal('executions', totalCount);
    } catch (err: unknown) {
      console.error('[WorkflowStore] loadExecutions error:', err);
      this.setError('executions', err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      this.setLoading('executions', false);
    }
  }

  async loadExecution(projectId: string, executionId: string): Promise<void> {
    this.setLoading('executions', true);
    this.setError('executions', null);
    try {
      const e = await request.get<any>(
        Endpoints.workflow.executions.get(projectId, executionId)
      );
      const raw = e.data ?? e;
      const normalized: Types.WorkflowExecution = {
        ...raw,
        id: raw.id ?? raw.executionId,
        refId: raw.refId ?? raw.playbookId,
        name: raw.name ?? raw.playbookName ?? 'Playbook Execution',
        type: raw.type ?? 'playbook',
        completedAt: raw.completedAt ?? raw.finishedAt,
        status: (raw.status ?? 'queued').toLowerCase() as any,
        // Phase 2: pass through runtime context fields
        variables: raw.variables ?? {},
        artifacts: raw.artifacts ?? [],
        artifactsCount: raw.artifactsCount ?? (raw.artifacts ? raw.artifacts.length : 0),
        stepOutputs: raw.stepOutputs ?? {},
        timelineEvents: raw.timelineEvents ?? [],
        currentExecutor: raw.currentExecutor,
        currentAction: raw.currentAction,
        returnedSummary: raw.returnedSummary,
      };
      this.setState({ selectedExecution: normalized });
    } catch (err: unknown) {
      this.setError('executions', err instanceof Error ? err.message : 'Failed to load execution');
    } finally {
      this.setLoading('executions', false);
    }
  }

  async loadStatistics(projectId: string): Promise<void> {
    this.setLoading('statistics', true);
    this.setError('statistics', null);
    try {
      const stats = await request.get<Types.WorkflowStatistics>(
        Endpoints.workflow.statistics(projectId)
      );
      this.setStatistics(stats);
    } catch (err: unknown) {
      this.setError('statistics', err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      this.setLoading('statistics', false);
    }
  }

  // ─── Composite ───────────────────────────────────────────────────────────────

  async refresh(projectId: string): Promise<void> {
    await Promise.allSettled([
      this.loadPlaybooks(projectId),
      this.loadRules(projectId),
      this.loadAutomations(projectId),
      this.loadCases(projectId),
      this.loadExecutions(projectId),
      this.loadStatistics(projectId),
    ]);
  }

  reset(): void {
    this.setState(initialState);
  }
}

export const workflowStore = new WorkflowStore();
