export type Role = 'OWNER' | 'ANALYST' | 'VIEWER';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

export interface ProjectMember {
  id: string;
  joinedAt: string;
  role: Role;
  projectId: string;
  userId: string;
  user?: User;
}

export interface Asset {
  id: string;
  type: string;
  ip: string | null;
  hostname: string | null;
  tags: string[]; // parsed from JSON
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
}

export interface Finding {
  id: string;
  type: string;
  severity: Severity;
  description: string;
  createdAt: string;
  assetId: string;
  projectId: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  authorId: string;
  author?: User;
}

export interface TimelineEntry {
  // Unified schema
  eventId:         string;
  projectId:       string;
  executionId:     string | null;
  investigationId: string | null;
  source:          string;
  title:           string;
  description:     string;
  severity:        string | null;
  createdAt:       string;
  metadata:        any | null;
  user:            { id: string; name: string } | null;
  // Legacy compat
  id:              string;
  action:          string;
}

export interface Attachment {
  id: string;
  filename: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  projectId: string;
  assetId: string | null;
  uploadedById: string;
}

export interface Invite {
  id: string;
  email: string;
  role: Role;
  token: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  projectId: string;
}

export interface Report {
  id: string;
  title: string;
  sections: string[]; // parsed from JSON
  aiContent: any; // parsed JSON
  riskLevel: string;
  createdAt: string;
  projectId: string;
  generatedById: string;
  generatedBy?: User;
}

export interface Scan {
  id: string;
  target: string;
  results: any; // parsed JSON
  createdAt: string;
  projectId: string;
}

export interface CaptureSession {
  id: string;
  projectId: string;
  alerts: any;
  iocs: any;
  timeline: any;
  mitre: any;
  riskRanking: any;
  attackStory: any | null;
  investigationPlan: any | null;
  trafficIntelligence: any | null;
  findings: any | null;
  executiveReport: string;
  captureStatus: 'idle' | 'running' | 'paused' | 'stopped';
  captureComplete: boolean;
  captureStartedAt: string | null;
  captureStoppedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── API Payload Types ────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  passwordHash: string; // or plain password depending on route
  name: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface CreateAssetRequest {
  type: string;
  ip?: string;
  hostname?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateAssetRequest {
  type?: string;
  ip?: string | null;
  hostname?: string | null;
  tags?: string[];
  notes?: string | null;
}

export interface CreateFindingRequest {
  type: string;
  severity: Severity;
  description: string;
  assetId: string;
}

export interface UpdateFindingRequest {
  type?: string;
  severity?: Severity;
  description?: string;
  assetId?: string;
}

export interface UpdateNoteRequest {
  content: string;
}

export interface CreateTimelineRequest {
  action: string;
  metadata?: any;
}

export interface InviteMemberRequest {
  email: string;
  role: Role;
}

export interface UpdateMemberRequest {
  role: Role;
}

export interface GenerateReportRequest {
  title: string;
  sections: string[];
}

export interface SaveScanRequest {
  target: string;
  results: any;
}

// ─── Knowledge Center Types ──────────────────────────────────────────────────

export interface MitreTechnique {
  id: string;            // e.g. "T1046"
  name: string;
  tactic: string;
  tacticId?: string;
  platforms?: string[];
  description?: string;
  detection?: string;
  mitigations?: string[];
  relatedTechniques?: string[];
  evidence?: string;     // from capture session
  subtechniques?: string[];
  url?: string;
  severity?: Severity;
}

export interface CveRecord {
  id: string;            // e.g. "CVE-2024-1234"
  description: string;
  cvssScore?: number;
  cvssVector?: string;
  severity?: Severity;
  vendor?: string;
  product?: string;
  publishedDate?: string;
  modifiedDate?: string;
  exploitabilityScore?: number;
  impactScore?: number;
  patchStatus?: 'patched' | 'unpatched' | 'workaround' | 'unknown';
  references?: string[];
  relatedFindings?: string[];
  relatedAssets?: string[];
  cweIds?: string[];
}

export type IocType = 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'filename';
export type IocStatus = 'active' | 'resolved' | 'monitoring' | 'false_positive';
export type Reputation = 'malicious' | 'suspicious' | 'benign' | 'unknown';

export interface IocRecord {
  id: string;
  value: string;
  type: IocType;
  reputation?: Reputation;
  confidence?: number;     // 0-100
  source?: string;
  status?: IocStatus;
  firstSeen?: string;
  lastSeen?: string;
  tags?: string[];
  threatLinks?: string[];  // threat actor names or IDs
  relatedFindings?: string[];
  description?: string;
  severity?: Severity;
  matchedRule?: string;
}

export interface ThreatActor {
  id: string;
  name: string;
  aliases?: string[];
  description?: string;
  motivation?: string;
  sophistication?: 'minimal' | 'intermediate' | 'advanced' | 'expert';
  country?: string;
  campaigns?: string[];
  techniques?: string[];  // MITRE technique IDs
  cves?: string[];
  iocs?: string[];
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  firstSeen?: string;
  lastSeen?: string;
  labels?: string[];
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: 'active' | 'concluded' | 'unknown';
  associatedActors?: string[];
  associatedTechniques?: string[];
  assets?: string[];
  findings?: string[];
  reports?: string[];
  objectives?: string;
  attribution?: string;
  severity?: Severity;
  iocs?: string[];
}

export interface KnowledgeGraphNode {
  id: string;
  type: 'asset' | 'finding' | 'ioc' | 'mitre' | 'threat_actor' | 'campaign' | 'cve';
  label: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight?: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface KnowledgeSearchResult {
  id: string;
  type: 'mitre' | 'cve' | 'ioc' | 'threat' | 'campaign';
  title: string;
  subtitle?: string;
  severity?: Severity;
  tags?: string[];
}

export interface KnowledgeFilters {
  severity?: Severity[];
  vendor?: string;
  platform?: string;
  confidence?: number;
  threatLevel?: string;
  campaign?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Workflow Center Types ───────────────────────────────────────────────────

export type PlaybookStatus = 'active' | 'inactive' | 'archived' | 'draft';
export type PlaybookCategory = 'incident_response' | 'threat_hunting' | 'forensics' | 'compliance' | 'remediation' | 'custom';
export type PlaybookPriority = 'critical' | 'high' | 'medium' | 'low';
export type StepType =
  | 'detection'
  | 'containment'
  | 'investigation'
  | 'eradication'
  | 'recovery'
  | 'notification'
  | 'manual'
  | 'automated'
  // legacy / generic types kept for backward-compat
  | 'action'
  | 'condition'
  | 'wait'
  | 'parallel';

export interface PlaybookStep {
  id: string;
  name: string;
  type: StepType;
  description?: string;
  order: number;
  /** Expected outcome / success criteria for this step */
  expectedOutcome?: string;
  /** CVE IDs referenced by this step, e.g. ["CVE-2024-1234"] */
  relatedCves?: string[];
  /** MITRE ATT&CK technique IDs, e.g. ["T1046"] */
  relatedMitre?: string[];
  /** IOC values (IPs, hashes, domains, etc.) */
  relatedIocs?: string[];
  config?: Record<string, unknown>;
  onSuccess?: string; // next step id
  onFailure?: string; // fallback step id
  timeout?: number; // seconds
}

export interface Playbook {
  id: string;
  name: string;
  description?: string;
  category: PlaybookCategory;
  priority: PlaybookPriority;
  status: PlaybookStatus;
  steps: PlaybookStep[];
  stepCount: number;
  author?: string;
  authorId?: string;
  tags?: string[];
  triggerCount: number;
  lastExecuted?: string;
  version?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export type RuleSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type RuleCategory = 'detection' | 'response' | 'compliance' | 'enrichment' | 'correlation' | 'custom';
export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'regex' | 'exists' | 'not_exists';
export type ActionType = 'create_finding' | 'send_alert' | 'trigger_playbook' | 'update_asset' | 'notify' | 'block_ip' | 'log' | 'webhook';

export interface RuleCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  id: string;
  type: ActionType;
  params?: Record<string, unknown>;
  order: number;
}

export interface Rule {
  id: string;
  name: string;
  description?: string;
  category: RuleCategory;
  severity: RuleSeverity;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  triggerCount: number;
  lastExecuted?: string;
  tags?: string[];
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export type AutomationStatus = 'queued' | 'running' | 'completed' | 'failed' | 'pending' | 'cancelled' | 'paused' | 'retrying' | 'scheduled';
export type AutomationTrigger = 'manual' | 'finding' | 'alert' | 'schedule' | 'rule' | 'playbook';

export interface AutomationLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface Automation {
  id: string;
  name: string;
  playbookId?: string;
  playbookName?: string;
  ruleId?: string;
  status: AutomationStatus;
  trigger: AutomationTrigger;
  triggeredBy?: string; // user id or system
  triggeredByName?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number; // ms
  progress?: number; // 0-100
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  logs: AutomationLog[];
  error?: string;
  result?: Record<string, unknown>;
  scheduledAt?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export type CaseStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed' | 'reopened';
export type CasePriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'skipped';

export interface CaseTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseNote {
  id: string;
  content: string;
  authorId?: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseFlow {
  id: string;
  title: string;
  description?: string;
  status: CaseStatus;
  priority: CasePriority;
  ownerId?: string;
  ownerName?: string;
  tasks: CaseTask[];
  notes: CaseNote[];
  linkedInvestigationId?: string;
  linkedFindings?: string[];
  tags?: string[];
  closedAt?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// Phase 2: typed artifact model
export interface WorkflowArtifact {
  artifactId: string;
  name: string;
  type: 'json' | 'xml' | 'pcap' | 'txt' | 'markdown' | 'csv' | 'report' | string;
  mimeType: string;
  producerExecutor: string;
  stepId: string;
  executionId: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  location: string;
  data?: unknown;
}

export interface WorkflowExecution {
  id: string;
  type: 'playbook' | 'rule' | 'automation';
  name: string;
  refId: string; // playbook/rule id
  status: AutomationStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  triggeredBy?: string;
  error?: string;
  logs: AutomationLog[];
  progress?: number;
  currentStep?: string;
  projectId: string;
  createdAt: string;
  // Phase 2: runtime context fields
  variables?: Record<string, unknown>;
  artifacts?: WorkflowArtifact[];
  artifactsCount?: number;
  stepOutputs?: Record<string, unknown>;
  timelineEvents?: Array<{ timestamp: string; title: string; description: string }>;
  // UI monitor fields
  currentExecutor?: string;
  currentAction?: string;
  returnedSummary?: string;
}

export interface WorkflowStatistics {
  totalPlaybooks: number;
  activeAutomations: number;
  runningExecutions: number;
  openCases: number;
  completedCases: number;
  ruleCount: number;
  successRate: number; // 0-100
  failedExecutions: number;
  averageDuration: number; // ms
  executionTimeline: Array<{ date: string; count: number; success: number; failed: number }>;
}

// ─── Workflow Request/Response Payloads ──────────────────────────────────────

export interface CreatePlaybookRequest {
  name: string;
  description?: string;
  category: PlaybookCategory;
  priority: PlaybookPriority;
  steps?: PlaybookStep[];
  tags?: string[];
}

export interface UpdatePlaybookRequest {
  name?: string;
  description?: string;
  category?: PlaybookCategory;
  priority?: PlaybookPriority;
  status?: PlaybookStatus;
  steps?: PlaybookStep[];
  tags?: string[];
}

export interface CreateRuleRequest {
  name: string;
  description?: string;
  category: RuleCategory;
  severity: RuleSeverity;
  conditions: RuleCondition[];
  actions: RuleAction[];
  tags?: string[];
}

export interface UpdateRuleRequest {
  name?: string;
  description?: string;
  category?: RuleCategory;
  severity?: RuleSeverity;
  enabled?: boolean;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
  tags?: string[];
}

export interface CreateCaseRequest {
  title: string;
  description?: string;
  priority: CasePriority;
  ownerId?: string;
  linkedFindings?: string[];
  tags?: string[];
}

export interface UpdateCaseRequest {
  title?: string;
  description?: string;
  status?: CaseStatus;
  priority?: CasePriority;
  ownerId?: string;
  linkedFindings?: string[];
  tags?: string[];
}

export interface AddCaseTaskRequest {
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateCaseTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assigneeId?: string;
  dueDate?: string;
}

export interface AddCaseNoteRequest {
  content: string;
}

export interface TriggerAutomationRequest {
  playbookId?: string;
  ruleId?: string;
  trigger: AutomationTrigger;
  params?: Record<string, unknown>;
  scheduledAt?: string;
}

// ─── Agent API Payload/Response Types ───────────────────────────────────────

export interface AgentInterface {
  name: string;
  description?: string;
  addresses?: string[];
}

export interface AgentScanRequest {
  target: string;
  ports?: number[];
  intensity?: 'fast' | 'normal' | 'deep';
}

export interface AgentPcapAnalyzeRequest {
  pcapPath?: string;
  stream?: boolean;
}

export interface AgentPcapPacketsRequest {
  offset?: number;
  limit?: number;
  filter?: string;
}

export interface AgentDnsInfo {
  query: string;
  type: string;
  response: string[];
  timestamp: string;
}

export interface AgentPcapSummary {
  duration: number;
  packetCount: number;
  totalBytes: number;
  protocols: Record<string, number>;
}

export interface AgentFinding {
  title: string;
  severity: Severity;
  description: string;
  category: string;
  evidence?: string;
}

export interface AgentIoc {
  value: string;
  type: 'ip' | 'domain' | 'hash';
  matchedRule: string;
  severity: Severity;
  description: string;
}

export interface AgentIpInfo {
  ip: string;
  country?: string;
  org?: string;
  hostname?: string;
}

export interface AgentIpReputation {
  ip: string;
  score: number;
  malicious: boolean;
  categories: string[];
}

export interface AgentReportGenerateRequest {
  projectId: string;
  notes?: string;
}
