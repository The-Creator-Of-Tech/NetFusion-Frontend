/**
 * store/reports.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Reports Center store.
 * Manages the full lifecycle of reports: listing, detail, statistics,
 * export progress, filters, sorting, and pagination.
 * Follows the same Store<T> pattern used by workflow, knowledge, etc.
 */

import { Store } from './base';
import { request } from '../api/request';
import { Endpoints } from '../api/endpoints';
import type {
  ReportRow,
  ReportDetail,
  ReportStatistics,
  ReportFilters,
  ReportSortBy,
  SortOrder,
  GenerateReportRequest,
  ExportProgress,
  ExportFormat,
  ReportPagination,
} from '../types/reports';

// ─── State shape ──────────────────────────────────────────────────────────────

export interface ReportsState {
  /** Flat list of all report rows for this project */
  reports: ReportRow[];

  /** The currently selected/viewed report (full detail) */
  selectedReport: ReportDetail | null;

  /** Dashboard statistics */
  statistics: ReportStatistics | null;

  /** Active filters */
  filters: ReportFilters;

  /** Current sort configuration */
  sortBy: ReportSortBy;
  sortOrder: SortOrder;

  /** Pagination */
  pagination: ReportPagination;

  /** Loading flags */
  loading: {
    list: boolean;
    detail: boolean;
    statistics: boolean;
    generate: boolean;
    export: boolean;
  };

  /** Error messages */
  error: {
    list: string | null;
    detail: string | null;
    statistics: string | null;
    generate: string | null;
    export: string | null;
  };

  /** Export progress tracking */
  exportProgress: ExportProgress;

  /** Generation progress message (shown while generate is running) */
  generateProgress: string;

  /** Last refreshed timestamp */
  lastRefreshedAt: string | null;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: ReportsState = {
  reports: [],
  selectedReport: null,
  statistics: null,
  filters: {
    search: '',
    riskLevel: null,
    dateFrom: null,
    dateTo: null,
  },
  sortBy: 'date',
  sortOrder: 'desc',
  pagination: {
    page: 1,
    total: 0,
    limit: 10,
  },
  loading: {
    list: false,
    detail: false,
    statistics: false,
    generate: false,
    export: false,
  },
  error: {
    list: null,
    detail: null,
    statistics: null,
    generate: null,
    export: null,
  },
  exportProgress: {
    format: 'pdf',
    status: 'idle',
    filename: null,
    error: null,
  },
  generateProgress: '',
  lastRefreshedAt: null,
};

// ─── Store class ──────────────────────────────────────────────────────────────

export class ReportsStore extends Store<ReportsState> {
  constructor() {
    super(initialState);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private setLoading(section: keyof ReportsState['loading'], value: boolean): void {
    this.setState((s) => ({ loading: { ...s.loading, [section]: value } }));
  }

  private setError(section: keyof ReportsState['error'], msg: string | null): void {
    this.setState((s) => ({ error: { ...s.error, [section]: msg } }));
  }

  // ─── Public error clear (used by hooks) ─────────────────────────────────────

  clearError(section: keyof ReportsState['error']): void {
    this.setState((s) => ({ error: { ...s.error, [section]: null } }));
  }

  // ─── Setters ────────────────────────────────────────────────────────────────

  setReports(reports: ReportRow[]): void {
    this.setState({ reports });
  }

  addReport(report: ReportRow): void {
    this.setState((s) => ({ reports: [report, ...s.reports] }));
  }

  removeReport(id: string): void {
    this.setState((s) => ({ reports: s.reports.filter((r) => r.id !== id) }));
  }

  setSelectedReport(report: ReportDetail | null): void {
    this.setState({ selectedReport: report });
  }

  setStatistics(statistics: ReportStatistics | null): void {
    this.setState({ statistics });
  }

  setFilters(filters: Partial<ReportFilters>): void {
    this.setState((s) => ({
      filters: { ...s.filters, ...filters },
      pagination: { ...s.pagination, page: 1 }, // reset to page 1 on filter change
    }));
  }

  resetFilters(): void {
    this.setState({
      filters: { search: '', riskLevel: null, dateFrom: null, dateTo: null },
      pagination: { ...this.getState().pagination, page: 1 },
    });
  }

  setSortBy(sortBy: ReportSortBy): void {
    this.setState({ sortBy });
  }

  setSortOrder(sortOrder: SortOrder): void {
    this.setState({ sortOrder });
  }

  toggleSortOrder(): void {
    this.setState((s) => ({ sortOrder: s.sortOrder === 'asc' ? 'desc' : 'asc' }));
  }

  setPage(page: number): void {
    this.setState((s) => ({
      pagination: {
        ...s.pagination,
        page: Math.max(1, Math.min(page, Math.ceil(s.pagination.total / s.pagination.limit) || 1)),
      },
    }));
  }

  setTotal(total: number): void {
    this.setState((s) => ({ pagination: { ...s.pagination, total } }));
  }

  setLimit(limit: number): void {
    this.setState((s) => ({ pagination: { ...s.pagination, limit: Math.max(1, limit), page: 1 } }));
  }

  setGenerateProgress(msg: string): void {
    this.setState({ generateProgress: msg });
  }

  setExportProgress(progress: Partial<ExportProgress>): void {
    this.setState((s) => ({ exportProgress: { ...s.exportProgress, ...progress } }));
  }

  // ─── Derived selectors ──────────────────────────────────────────────────────

  /**
   * Returns reports filtered + sorted by the current state configuration.
   * Pure function — no side-effects.
   */
  getFilteredSortedReports(): ReportRow[] {
    const { reports, filters, sortBy, sortOrder } = this.getState();

    const RISK_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    let result = [...reports];

    // Search filter
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.generatedBy.toLowerCase().includes(q) ||
          r.riskLevel.toLowerCase().includes(q),
      );
    }

    // Risk level filter
    if (filters.riskLevel) {
      result = result.filter((r) => r.riskLevel === filters.riskLevel);
    }

    // Date range filter
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime();
      result = result.filter((r) => new Date(r.createdAt).getTime() >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo + 'T23:59:59Z').getTime();
      result = result.filter((r) => new Date(r.createdAt).getTime() <= to);
    }

    // Sort
    result.sort((a, b) => {
      let diff: number;
      if (sortBy === 'risk') {
        diff = (RISK_ORDER[a.riskLevel] ?? 99) - (RISK_ORDER[b.riskLevel] ?? 99);
      } else if (sortBy === 'title') {
        diff = a.title.localeCompare(b.title);
      } else {
        // date
        diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'asc' ? diff : -diff;
    });

    return result;
  }

  /**
   * Returns the current page slice of filtered+sorted reports.
   */
  getPagedReports(): ReportRow[] {
    const { pagination } = this.getState();
    const all = this.getFilteredSortedReports();
    const offset = (pagination.page - 1) * pagination.limit;
    return all.slice(offset, offset + pagination.limit);
  }

  /**
   * Computes statistics from the in-memory report list (client-side).
   */
  computeStatistics(): ReportStatistics {
    const { reports } = this.getState();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfDay - now.getDay() * 86400000;

    const today = reports.filter((r) => new Date(r.createdAt).getTime() >= startOfDay).length;
    const thisWeek = reports.filter((r) => new Date(r.createdAt).getTime() >= startOfWeek).length;

    const byRiskLevel: Record<string, number> = {};
    for (const r of reports) {
      byRiskLevel[r.riskLevel] = (byRiskLevel[r.riskLevel] ?? 0) + 1;
    }

    const recentReports = [...reports]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return { total: reports.length, today, thisWeek, byRiskLevel, recentReports };
  }

  // ─── Async: Load list ───────────────────────────────────────────────────────

  async loadReports(projectId: string): Promise<void> {
    this.setLoading('list', true);
    this.setError('list', null);
    try {
      const res = await request.get<{ reports: ReportRow[] }>(
        Endpoints.projects.reports.list(projectId),
      );
      const reports = res.reports ?? [];
      this.setReports(reports);
      this.setTotal(reports.length);
      this.setState({ lastRefreshedAt: new Date().toISOString() });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load reports';
      this.setError('list', msg);
    } finally {
      this.setLoading('list', false);
    }
  }

  // ─── Async: Load statistics ─────────────────────────────────────────────────

  async loadStatistics(projectId: string): Promise<void> {
    this.setLoading('statistics', true);
    this.setError('statistics', null);
    try {
      // Statistics are computed client-side from the report list.
      // If reports aren't loaded yet, load them first.
      if (this.getState().reports.length === 0) {
        await this.loadReports(projectId);
      }
      const stats = this.computeStatistics();
      this.setStatistics(stats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load statistics';
      this.setError('statistics', msg);
    } finally {
      this.setLoading('statistics', false);
    }
  }

  // ─── Async: Generate report (returns PDF blob URL) ──────────────────────────

  async generateReport(
    projectId: string,
    payload: GenerateReportRequest,
    onProgress?: (msg: string) => void,
  ): Promise<{ blobUrl: string; filename: string; reportRow: ReportRow }> {
    this.setLoading('generate', true);
    this.setError('generate', null);
    this.setGenerateProgress('Fetching project data…');
    onProgress?.('Fetching project data…');

    try {
      this.setGenerateProgress('Calling AI — this may take 15–30 seconds…');
      onProgress?.('Calling AI — this may take 15–30 seconds…');

      const res = await fetch(Endpoints.projects.reports.generate(projectId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as { error?: string }).error ?? 'Failed to generate report';
        throw new Error(msg);
      }

      this.setGenerateProgress('Rendering PDF…');
      onProgress?.('Rendering PDF…');

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const cd = res.headers.get('Content-Disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? 'report.pdf';

      // Optimistic report row (will be refreshed from server)
      const reportRow: ReportRow = {
        id: Date.now().toString(),
        title: payload.title,
        riskLevel: 'MEDIUM',
        sections: payload.sections,
        createdAt: new Date().toISOString(),
        generatedBy: 'You',
      };

      // Insert optimistically then refresh the real list
      this.addReport(reportRow);
      this.setTotal(this.getState().reports.length);

      // Background refresh to get the real record
      this.loadReports(projectId).catch(() => {});

      return { blobUrl, filename, reportRow };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate report';
      this.setError('generate', msg);
      throw err;
    } finally {
      this.setLoading('generate', false);
      this.setGenerateProgress('');
      onProgress?.('');
    }
  }

  // ─── Async: Export ──────────────────────────────────────────────────────────

  async exportReport(
    projectId: string,
    report: ReportRow,
    format: ExportFormat,
  ): Promise<void> {
    this.setLoading('export', true);
    this.setError('export', null);
    this.setExportProgress({ format, status: 'generating', filename: null, error: null });

    try {
      if (format === 'json') {
        // Export as JSON — use the report data we already have
        const json = JSON.stringify(report, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const safeName = report.title.replace(/[^a-z0-9]/gi, '_');
        const filename = `${safeName}_${Date.now()}.json`;
        this._triggerDownload(url, filename);
        this.setExportProgress({ status: 'done', filename });
      } else if (format === 'markdown') {
        // Export as Markdown
        const md = this._reportToMarkdown(report);
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const safeName = report.title.replace(/[^a-z0-9]/gi, '_');
        const filename = `${safeName}_${Date.now()}.md`;
        this._triggerDownload(url, filename);
        this.setExportProgress({ status: 'done', filename });
      } else {
        // PDF — re-generate
        const res = await fetch(Endpoints.projects.reports.generate(projectId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: report.title,
            sections: report.sections,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? 'Export failed');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const cd = res.headers.get('Content-Disposition') ?? '';
        const match = cd.match(/filename="([^"]+)"/);
        const filename = match?.[1] ?? 'report.pdf';
        this._triggerDownload(url, filename);
        this.setExportProgress({ status: 'done', filename });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      this.setError('export', msg);
      this.setExportProgress({ status: 'error', error: msg });
    } finally {
      this.setLoading('export', false);
    }
  }

  // ─── Async: Refresh (list + statistics) ─────────────────────────────────────

  async refresh(projectId: string): Promise<void> {
    await this.loadReports(projectId);
    const stats = this.computeStatistics();
    this.setStatistics(stats);
  }

  // ─── Reset ──────────────────────────────────────────────────────────────────

  reset(): void {
    this.setState(initialState);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private _triggerDownload(url: string, filename: string): void {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  private _reportToMarkdown(report: ReportRow): string {
    const lines: string[] = [
      `# ${report.title}`,
      '',
      `**Risk Level:** ${report.riskLevel}`,
      `**Generated By:** ${report.generatedBy}`,
      `**Generated At:** ${new Date(report.createdAt).toLocaleString()}`,
      '',
      '## Sections Included',
      '',
      ...report.sections.map((s) => `- ${s}`),
      '',
      '---',
      '',
      '*Full content available in PDF format.*',
    ];
    return lines.join('\n');
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const reportsStore = new ReportsStore();
