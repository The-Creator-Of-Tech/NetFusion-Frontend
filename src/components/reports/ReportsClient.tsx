"use client";

import { useState, useEffect, useCallback } from "react";
import { reportsStore } from "@/store/reports";
import { useReports } from "@/hooks/useReports";
import { useReportEditor } from "@/hooks/useReportEditor";
import { useReportExport } from "@/hooks/useReportExport";
import { useReportStatistics } from "@/hooks/useReportStatistics";
import type { ReportRow, GenerateReportRequest, ReportSectionKey, ExportFormat } from "@/types/reports";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  projectName?: string;
  initialReports?: ReportRow[];
}

// ── Config ─────────────────────────────────────────────────────────────────────

const SECTION_OPTIONS: { key: ReportSectionKey; label: string; desc: string }[] = [
  { key: "executiveSummary",   label: "Executive Summary",      desc: "AI-generated 2–3 paragraph overview" },
  { key: "assetInventory",     label: "Asset Inventory",        desc: "Full asset table with finding counts" },
  { key: "findingsBySeverity", label: "Findings by Severity",   desc: "Categorised finding cards + table" },
  { key: "recommendations",    label: "Recommendations",        desc: "Prioritised remediation actions" },
  { key: "timeline",           label: "Investigation Timeline", desc: "Chronological activity log" },
];

const RISK_COLORS: Record<string, string> = {
  CRITICAL: "text-red-400 bg-red-500/10 border-red-500/20",
  HIGH:     "text-orange-400 bg-orange-500/10 border-orange-500/20",
  MEDIUM:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  LOW:      "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ── Statistics Bar ─────────────────────────────────────────────────────────────

function StatisticsBar({ projectId }: { projectId: string }) {
  const { statistics, loading, refresh } = useReportStatistics(projectId);

  const cards = [
    { label: "Total Reports",    value: statistics?.total     ?? 0, color: "text-accent" },
    { label: "Generated Today",  value: statistics?.today     ?? 0, color: "text-emerald-400" },
    { label: "This Week",        value: statistics?.thisWeek  ?? 0, color: "text-blue-400" },
    { label: "Critical Risk",    value: statistics?.byRiskLevel?.CRITICAL ?? 0, color: "text-red-400" },
    { label: "High Risk",        value: statistics?.byRiskLevel?.HIGH     ?? 0, color: "text-orange-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-surface border border-border rounded-xl px-4 py-3">
          <p className={`text-xl font-bold ${c.color}`}>
            {loading ? <span className="animate-pulse">—</span> : c.value}
          </p>
          <p className="text-xs text-muted mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Export Menu ────────────────────────────────────────────────────────────────

function ExportMenu({
  report,
  projectId,
  onClose,
}: {
  report: ReportRow;
  projectId: string;
  onClose: () => void;
}) {
  const { exportReport, exportProgress, loading } = useReportExport(projectId);

  const formats: { format: ExportFormat; label: string; icon: string }[] = [
    { format: "pdf",      label: "Download PDF",      icon: "📄" },
    { format: "markdown", label: "Export Markdown",   icon: "📝" },
    { format: "json",     label: "Export JSON",       icon: "{ }" },
  ];

  async function handleExport(format: ExportFormat) {
    await exportReport(report, format);
    onClose();
  }

  return (
    <div className="absolute right-0 top-7 z-30 bg-surface border border-border rounded-xl shadow-2xl py-1 min-w-[170px]">
      {exportProgress.status === "generating" ? (
        <div className="px-4 py-3 flex items-center gap-2 text-xs text-muted">
          <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Generating…
        </div>
      ) : (
        formats.map(({ format, label, icon }) => (
          <button
            key={format}
            onClick={() => handleExport(format)}
            disabled={loading}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            <span className="text-sm">{icon}</span>
            {label}
          </button>
        ))
      )}
    </div>
  );
}

// ── Report Detail Modal ────────────────────────────────────────────────────────

function ReportDetailModal({
  report,
  projectId,
  onClose,
}: {
  report: ReportRow;
  projectId: string;
  onClose: () => void;
}) {
  const { exportReport, exportProgress, loading: exportLoading } = useReportExport(projectId);
  const [showExport, setShowExport] = useState(false);

  async function handleExport(format: ExportFormat) {
    setShowExport(false);
    await exportReport(report, format);
  }

  const riskClass = RISK_COLORS[report.riskLevel] ?? RISK_COLORS.LOW;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-xl w-full max-w-xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">{report.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${riskClass}`}>
                {report.riskLevel}
              </span>
              <span className="text-xs text-muted">{formatDate(report.createdAt)}</span>
              <span className="text-xs text-muted">by {report.generatedBy}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground p-1 rounded ml-2 shrink-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Sections */}
          <div>
            <p className="text-xs font-medium text-muted mb-2">Sections Included</p>
            <div className="flex flex-wrap gap-1.5">
              {report.sections.map((s) => (
                <span key={s} className="text-xs text-muted bg-surface-2 border border-border rounded px-2 py-0.5">
                  {SECTION_OPTIONS.find((o) => o.key === s)?.label ?? s}
                </span>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Report ID",    value: report.id },
              { label: "Generated By", value: report.generatedBy },
              { label: "Created At",   value: formatDate(report.createdAt) },
              { label: "Risk Level",   value: report.riskLevel },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-2 rounded-lg px-3 py-2">
                <p className="text-xs text-muted">{label}</p>
                <p className="text-xs font-medium text-foreground mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Export status */}
          {exportProgress.status === "done" && exportProgress.filename && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-emerald-400 shrink-0">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.749.749 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
              <p className="text-xs text-emerald-400">Downloaded: {exportProgress.filename}</p>
            </div>
          )}
          {exportProgress.status === "error" && (
            <p className="text-xs text-danger bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
              Export failed: {exportProgress.error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-2">
          <div className="relative flex-1">
            <button
              onClick={() => setShowExport((v) => !v)}
              disabled={exportLoading}
              className="w-full flex items-center justify-center gap-1.5 bg-accent text-background py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {exportLoading ? (
                <><div className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" /> Exporting…</>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" /><path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.779a.749.749 0 1 1 1.06-1.06l1.97 1.97Z" />
                  </svg>
                  Export ▾
                </>
              )}
            </button>
            {showExport && (
              <div className="absolute bottom-full left-0 mb-1 z-30 bg-surface border border-border rounded-xl shadow-2xl py-1 min-w-[170px]">
                {[
                  { format: "pdf" as ExportFormat,      label: "Download PDF",    icon: "📄" },
                  { format: "markdown" as ExportFormat, label: "Export Markdown", icon: "📝" },
                  { format: "json" as ExportFormat,     label: "Export JSON",     icon: "{ }" },
                ].map(({ format, label, icon }) => (
                  <button key={format} onClick={() => handleExport(format)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-foreground hover:bg-surface-2 transition-colors">
                    <span>{icon}</span>{label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose}
            className="flex-1 border border-border text-muted py-2 rounded-lg text-sm hover:bg-surface-2 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generate Panel ─────────────────────────────────────────────────────────────

interface GeneratePanelProps {
  projectId: string;
  projectName?: string;
  onClose: () => void;
}

function GeneratePanel({ projectId, projectName = "", onClose }: GeneratePanelProps) {
  const namePrefix = projectName ? `${projectName} — ` : "";
  const defaultTitle = `${namePrefix}Security Report ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const [title,    setTitle]   = useState(defaultTitle);
  const [sections, setSections] = useState<ReportSectionKey[]>(SECTION_OPTIONS.map((s) => s.key));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [localErr, setLocalErr] = useState("");

  const { generate, loading, error, progress } = useReportEditor(projectId);

  function toggleSection(key: ReportSectionKey) {
    setSections((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]);
  }

  async function handleGenerate() {
    if (!title.trim()) { setLocalErr("Title is required"); return; }
    if (sections.length === 0) { setLocalErr("Select at least one section"); return; }
    setLocalErr("");

    const payload: GenerateReportRequest = {
      title: title.trim(),
      sections,
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo   ? { dateTo }   : {}),
    };

    try {
      const { blobUrl, filename } = await generate(payload);
      // Trigger download
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      onClose();
    } catch {
      // error surfaced via hook
    }
  }

  const displayError = localErr || error || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Generate Report</h2>
            <p className="text-xs text-muted mt-0.5">AI-powered security investigation report</p>
          </div>
          {!loading && (
            <button onClick={onClose} className="text-muted hover:text-foreground p-1 rounded transition-colors">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          )}
        </div>

        <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Report Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors disabled:opacity-50" />
          </div>

          {/* Sections */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">Sections to Include</label>
            <div className="space-y-2">
              {SECTION_OPTIONS.map(({ key, label, desc }) => {
                const checked = sections.includes(key);
                return (
                  <button key={key} type="button" disabled={loading} onClick={() => toggleSection(key)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors disabled:opacity-50"
                    style={{ background: checked ? "rgba(var(--accent-rgb),0.08)" : "", borderColor: checked ? "rgba(var(--accent-rgb),0.3)" : "" }}>
                    <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-accent border-accent" : "border-border bg-surface"}`}>
                      {checked && <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" className="text-background"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.749.749 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" /></svg>}
                    </span>
                    <div>
                      <p className={`text-xs font-medium ${checked ? "text-foreground" : "text-muted"}`}>{label}</p>
                      <p className="text-xs text-muted font-normal mt-0.5">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">
              Date Range <span className="font-normal ml-1">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted mb-1">From</p>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={loading}
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-colors disabled:opacity-50" />
              </div>
              <div>
                <p className="text-xs text-muted mb-1">To</p>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} disabled={loading}
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-colors disabled:opacity-50" />
              </div>
            </div>
          </div>

          {displayError && (
            <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{displayError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          {loading ? (
            <div className="flex items-center gap-3 justify-center py-1">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-sm text-muted">{progress || "Processing…"}</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 border border-border text-muted py-2 rounded-lg text-sm hover:bg-surface-2 transition-colors">
                Cancel
              </button>
              <button onClick={handleGenerate} disabled={sections.length === 0}
                className="flex-1 bg-accent text-background py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
                  <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.779a.749.749 0 1 1 1.06-1.06l1.97 1.97Z" />
                </svg>
                Generate &amp; Download PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Filter Bar ─────────────────────────────────────────────────────────────────

function FilterBar({ projectId }: { projectId: string }) {
  const { filters, sortBy, sortOrder, setFilters, resetFilters, setSortBy } = useReports(projectId);

  const riskOptions = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px]">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
        </svg>
        <input
          type="text"
          placeholder="Search reports…"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
        />
      </div>

      {/* Risk filter */}
      <select
        value={filters.riskLevel ?? ""}
        onChange={(e) => setFilters({ riskLevel: e.target.value || null })}
        className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
      >
        <option value="">All Risks</option>
        {riskOptions.filter(Boolean).map((r) => <option key={r} value={r}>{r}</option>)}
      </select>

      {/* Sort */}
      {(["date", "risk", "title"] as const).map((key) => (
        <button key={key}
          onClick={() => setSortBy(key)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
            sortBy === key ? "bg-accent/15 border-accent/30 text-accent" : "border-border text-muted hover:text-foreground hover:bg-surface-2"
          }`}>
          {key.charAt(0).toUpperCase() + key.slice(1)}
          {sortBy === key && <span className="ml-1">{sortOrder === "asc" ? "▲" : "▼"}</span>}
        </button>
      ))}

      {/* Reset */}
      {(filters.search || filters.riskLevel || filters.dateFrom || filters.dateTo) && (
        <button onClick={resetFilters} className="text-xs text-danger hover:text-danger/80 transition-colors px-2 py-1.5">
          Clear ✕
        </button>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ReportsClient({ projectId, projectName = "", initialReports = [] }: Props) {
  const {
    pagedReports, totalFiltered,
    page, limit, totalPages, hasNextPage, hasPrevPage,
    nextPage, prevPage,
    loading, error,
    refresh,
  } = useReports(projectId);

  const [panelOpen,   setPanelOpen]   = useState(false);
  const [detailReport, setDetailReport] = useState<ReportRow | null>(null);
  const [exportMenuId, setExportMenuId] = useState<string | null>(null);

  // Seed store with SSR data on first render
  useEffect(() => {
    if (initialReports && initialReports.length > 0 && reportsStore.getState().reports.length === 0) {
      reportsStore.setReports(initialReports);
      reportsStore.setTotal(initialReports.length);
    }
  }, [initialReports]);

  // Close export menu on outside click
  useEffect(() => {
    if (!exportMenuId) return;
    const handler = () => setExportMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [exportMenuId]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Reports</h1>
          <p className="text-muted text-xs mt-0.5">AI-generated security investigation reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={loading} title="Refresh"
            className="p-2 border border-border rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={loading ? "animate-spin" : ""}>
              <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
            </svg>
          </button>
          <button onClick={() => setPanelOpen(true)}
            className="flex items-center gap-1.5 bg-accent text-background px-3 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
            </svg>
            Generate Report
          </button>
        </div>
      </div>

      {/* Statistics */}
      <StatisticsBar projectId={projectId} />

      {/* AI key notice */}
      {!process.env.NEXT_PUBLIC_HAS_AI && (
        <div className="mb-5 flex items-start gap-3 bg-accent/5 border border-accent/20 rounded-xl px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-accent shrink-0 mt-0.5">
            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
          </svg>
          <div>
            <p className="text-xs font-medium text-accent">AI-Enhanced Reports</p>
            <p className="text-xs text-muted mt-0.5">
              Set <code className="bg-surface-2 px-1 rounded text-accent">GROQ_API_KEY</code> for AI-powered summaries.
              Without it, reports use built-in analysis.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-danger-dim border border-danger/20 rounded-xl px-4 py-3">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-danger shrink-0">
            <path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
          </svg>
          <p className="text-xs text-danger">{error}</p>
          <button onClick={refresh} className="ml-auto text-xs text-danger underline">Retry</button>
        </div>
      )}

      {/* Filters */}
      <FilterBar projectId={projectId} />

      {/* Loading skeleton */}
      {loading && pagedReports.length === 0 && (
        <div className="space-y-2">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-xl h-14 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && totalFiltered === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-muted">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.75 0h8.5C13.216 0 14 .784 14 1.75v12.5A1.75 1.75 0 0 1 12.25 16h-8.5A1.75 1.75 0 0 1 2 14.25V1.75C2 .784 2.784 0 3.75 0Zm0 1.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-8.5ZM4.75 4h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5Zm0 3h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5Zm0 3h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1 0-1.5Z" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-1">No reports found</p>
          <p className="text-muted text-sm mb-4">
            {reportsStore.getState().reports.length === 0
              ? "Generate your first report to get a professional PDF summary"
              : "No reports match your current filters"}
          </p>
          {reportsStore.getState().reports.length === 0 ? (
            <button onClick={() => setPanelOpen(true)}
              className="bg-accent text-background px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors">
              Generate Report
            </button>
          ) : null}
        </div>
      )}

      {/* Table */}
      {!loading && pagedReports.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden md:table-cell">Sections</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden sm:table-cell">Generated By</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Date</th>
                <th className="px-4 py-3 w-28 text-xs font-medium text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedReports.map((r, i) => {
                const riskClass = RISK_COLORS[r.riskLevel] ?? RISK_COLORS.LOW;
                return (
                  <tr key={r.id}
                    className={`border-b border-border last:border-0 transition-colors hover:bg-surface-2/40 ${i % 2 === 1 ? "bg-surface/50" : ""}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => setDetailReport(r)}
                        className="font-medium text-foreground hover:text-accent transition-colors text-left">
                        {r.title}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${riskClass}`}>
                        {r.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {r.sections.slice(0, 3).map((s) => (
                          <span key={s} className="text-xs text-muted bg-surface-2 border border-border rounded px-1.5 py-0.5">
                            {SECTION_OPTIONS.find((o) => o.key === s)?.label ?? s}
                          </span>
                        ))}
                        {r.sections.length > 3 && <span className="text-xs text-muted">+{r.sections.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs hidden sm:table-cell">{r.generatedBy}</td>
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View */}
                        <button onClick={() => setDetailReport(r)} title="View details"
                          className="text-muted hover:text-accent transition-colors">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.825 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z" />
                          </svg>
                        </button>
                        {/* Re-generate PDF */}
                        <button onClick={() => setPanelOpen(true)} title="New PDF"
                          className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
                            <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.779a.749.749 0 1 1 1.06-1.06l1.97 1.97Z" />
                          </svg>
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/80 p-4 text-xs text-muted">
              <span>
                Showing {(page - 1) * limit + 1}–{Math.min(totalFiltered, page * limit)} of {totalFiltered}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={prevPage} disabled={!hasPrevPage}
                  className="px-2.5 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Previous
                </button>
                <span className="font-mono px-2">Page {page} of {totalPages}</span>
                <button onClick={nextPage} disabled={!hasNextPage}
                  className="px-2.5 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {panelOpen && (
        <GeneratePanel projectId={projectId} projectName={projectName} onClose={() => setPanelOpen(false)} />
      )}
      {detailReport && (
        <ReportDetailModal report={detailReport} projectId={projectId} onClose={() => setDetailReport(null)} />
      )}
    </div>
  );
}
