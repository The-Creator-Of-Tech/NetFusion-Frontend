/**
 * reports.ts
 * Extended type definitions for the Reports Center.
 * Extends the base Report type from api.ts with richer shapes
 * used across the store, hooks, services, and UI layers.
 */

import type { Report, User, Finding } from './api';

// ─── Risk level ───────────────────────────────────────────────────────────────

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// ─── Report section keys ──────────────────────────────────────────────────────

export type ReportSectionKey =
  | 'executiveSummary'
  | 'assetInventory'
  | 'findingsBySeverity'
  | 'recommendations'
  | 'timeline';

// ─── AI content returned from Groq / stub ─────────────────────────────────────

export interface AiKeyFinding {
  severity: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface AiRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
}

export interface AiReportContent {
  executiveSummary: string;
  keyFindings: AiKeyFinding[];
  assetSummary: string;
  recommendations: AiRecommendation[];
  riskLevel: RiskLevel;
}

// ─── Serialised report row (list view) ───────────────────────────────────────

export interface ReportRow {
  id: string;
  title: string;
  riskLevel: string;
  sections: string[];
  createdAt: string;
  generatedBy: string;
}

// ─── Full report with AI content (detail view) ───────────────────────────────

export interface ReportDetail extends ReportRow {
  aiContent: AiReportContent;
  projectId: string;
  generatedById: string;
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export interface ReportStatistics {
  total: number;
  today: number;
  thisWeek: number;
  byRiskLevel: Record<string, number>;
  recentReports: ReportRow[];
}

// ─── Filters & sorting ────────────────────────────────────────────────────────

export type ReportSortBy = 'date' | 'risk' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface ReportFilters {
  search: string;
  riskLevel: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

// ─── Generate request ─────────────────────────────────────────────────────────

export interface GenerateReportRequest {
  title: string;
  sections: ReportSectionKey[];
  dateFrom?: string;
  dateTo?: string;
}

// ─── Export formats ───────────────────────────────────────────────────────────

export type ExportFormat = 'pdf' | 'markdown' | 'json';

export interface ExportProgress {
  format: ExportFormat;
  status: 'idle' | 'generating' | 'done' | 'error';
  filename: string | null;
  error: string | null;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface ReportPagination {
  page: number;
  total: number;
  limit: number;
}
