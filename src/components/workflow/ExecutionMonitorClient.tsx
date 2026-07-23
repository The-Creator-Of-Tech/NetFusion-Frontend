"use client";

import { useState, useEffect, useRef } from "react";
import { useExecutions } from "@/hooks/useExecutions";
import { useWorkflowStatistics } from "@/hooks/useWorkflowStatistics";
import { usePagination } from "@/hooks/usePagination";
import type { AutomationStatus } from "@/types/api";

// ── Expandable panel component ────────────────────────────────────────────────
function ExpandablePanel({
  title,
  badge,
  badgeColor = "text-muted",
  children,
  defaultOpen = false,
}: {
  title: string;
  badge?: string | number;
  badgeColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-2/60 hover:bg-surface-2 transition-colors text-left"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted/70">{title}</span>
        <span className="flex items-center gap-2">
          {badge !== undefined && (
            <span className={`text-xs font-mono font-semibold ${badgeColor}`}>{badge}</span>
          )}
          <span className="text-muted text-xs">{open ? "▲" : "▼"}</span>
        </span>
      </button>
      {open && <div className="p-4 bg-surface/60">{children}</div>}
    </div>
  );
}

const POLL_INTERVAL_MS = 5000;

// playbookId comes from URL params — survives refresh and direct navigation.
interface Props { projectId: string; playbookId: string }

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  queued:    { bg: "bg-indigo-500/10", text: "text-indigo-400", dot: "bg-indigo-400 animate-pulse" },
  running:   { bg: "bg-green-500/10",  text: "text-green-400",  dot: "bg-green-400 animate-pulse" },
  completed: { bg: "bg-accent/10",     text: "text-accent",     dot: "bg-accent" },
  failed:    { bg: "bg-red-500/10",    text: "text-red-400",    dot: "bg-red-400" },
  pending:   { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
  cancelled: { bg: "bg-surface-2",     text: "text-muted",      dot: "bg-muted" },
  paused:    { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" },
  retrying:  { bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-400 animate-pulse" },
  scheduled: { bg: "bg-blue-500/10",   text: "text-blue-400",   dot: "bg-blue-400" },
};

function formatDuration(ms?: number) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

const STATUS_FILTER_OPTIONS: (AutomationStatus | 'ALL')[] = ['ALL','queued','running','completed','failed','pending','cancelled','scheduled'];

export default function ExecutionMonitorClient({ projectId, playbookId }: Props) {
  // Both projectId and playbookId come from URL params — source of truth is the URL.
  const { executions, loading: exLoading, error: exError, refresh: refreshEx, select, selected } = useExecutions(projectId, playbookId);
  const { statistics, loading: statsLoading, refresh: refreshStats } = useWorkflowStatistics(projectId);
  const [statusFilter, setStatusFilter] = useState<AutomationStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Execution Outputs / Enriched Artifacts State ---
  const [enrichedArtifacts, setEnrichedArtifacts] = useState<any[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [viewingArtifact, setViewingArtifact] = useState<any | null>(null);
  const [viewingContent, setViewingContent] = useState<string | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [wiresharkOpening, setWiresharkOpening] = useState(false);
  const [wiresharkError, setWiresharkError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Poll or fetch enriched artifacts when an execution is selected
  useEffect(() => {
    if (!selected?.id) {
      setEnrichedArtifacts([]);
      return;
    }
    
    let active = true;
    async function fetchEnrichedArtifacts() {
      setArtifactsLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/workflow/executions/${selected?.id}/artifacts`);
        const json = await res.json();
        if (active && json.success && Array.isArray(json.data)) {
          setEnrichedArtifacts(json.data);
        }
      } catch (err) {
        console.error("Failed to load enriched artifacts:", err);
      } finally {
        if (active) setArtifactsLoading(false);
      }
    }
    
    fetchEnrichedArtifacts();
    
    let interval: ReturnType<typeof setInterval> | null = null;
    const isRunning = selected?.status ? ['running', 'pending', 'retrying', 'queued'].includes(selected.status.toLowerCase()) : false;
    if (isRunning) {
      interval = setInterval(() => {
        fetchEnrichedArtifacts();
      }, POLL_INTERVAL_MS);
    }
    
    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [selected?.id, selected?.status, projectId]);

  // Actions
  const handleView = async (artifact: any) => {
    setViewingArtifact(artifact);
    setViewingContent(null);
    setWiresharkError(null);
    
    if (artifact.data !== undefined && artifact.data !== null) {
      if (typeof artifact.data === 'object') {
        setViewingContent(JSON.stringify(artifact.data, null, 2));
      } else {
        setViewingContent(String(artifact.data));
      }
      return;
    }
    
    setViewingLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/workflow/executions/${selected?.id}/artifacts/${artifact.artifactId}/view`);
      const contentType = res.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const json = await res.json();
        const contentData = json.data !== undefined ? json.data : json;
        if (typeof contentData === 'object') {
          setViewingContent(JSON.stringify(contentData, null, 2));
        } else {
          setViewingContent(String(contentData));
        }
      } else {
        const text = await res.text();
        setViewingContent(text);
      }
    } catch (err) {
      console.error("Failed to load artifact view:", err);
      setViewingContent("Error loading content.");
    } finally {
      setViewingLoading(false);
    }
  };

  const handleDownload = async (artifact: any) => {
    const downloadUrl = `/api/projects/${projectId}/workflow/executions/${selected?.id}/artifacts/${artifact.artifactId}/download`;
    try {
      console.log("[DOWNLOAD PIPELINE] 1. Initiating fetch to:", downloadUrl);
      const response = await fetch(downloadUrl);
      console.log("[DOWNLOAD PIPELINE] response.status:", response.status);
      console.log("[DOWNLOAD PIPELINE] response.headers:", Array.from(response.headers.entries()));

      if (!response.ok) {
        console.error("[DOWNLOAD PIPELINE] Response failed with status", response.status);
        return;
      }

      const blob = await response.blob();
      console.log("[DOWNLOAD PIPELINE] blob.size:", blob.size);
      console.log("[DOWNLOAD PIPELINE] blob.type:", blob.type);

      if (blob.size === 0) {
        console.error("[DOWNLOAD PIPELINE] Backend returned 0-byte blob!");
        return;
      }

      let cleanName = artifact.name || "artifact";
      cleanName = cleanName.replace(/[-_]?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, "");
      cleanName = cleanName.replace(/[-_]?[0-9a-fA-F]{32}/g, "");
      cleanName = cleanName.replace(/analysis_capture.*\.md/i, "AI_Investigation_Report.md");

      // Check header disposition fallback
      const disposition = response.headers.get("content-disposition");
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/);
        if (match && match[1]) {
          cleanName = match[1];
        }
      }

      if (artifact.type === "markdown" || artifact.type === "report" || cleanName.toLowerCase().includes("investigation")) {
        cleanName = "AI_Investigation_Report.md";
      } else if (artifact.type === "pcap" || artifact.type === "pcapng" || cleanName.toLowerCase().includes("capture")) {
        const today = new Date().toISOString().split("T")[0];
        const ext = artifact.type === "pcapng" ? ".pcapng" : ".pcap";
        cleanName = `LiveCapture_${today}${ext}`;
      }

      console.log("[DOWNLOAD PIPELINE] download filename:", cleanName);

      const objectUrl = URL.createObjectURL(blob);
      console.log("[DOWNLOAD PIPELINE] Created Object URL:", objectUrl);

      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = cleanName;
      console.log("[DOWNLOAD PIPELINE] anchor.download:", a.download);
      console.log("[DOWNLOAD PIPELINE] anchor.href:", a.href);

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        console.log("[DOWNLOAD PIPELINE] Revoking Object URL:", objectUrl);
        URL.revokeObjectURL(objectUrl);
      }, 60000);
    } catch (err) {
      console.error("[DOWNLOAD PIPELINE] Error during download:", err);
    }
  };

  const handleOpenInWireshark = async (artifact: any) => {
    setWiresharkOpening(true);
    setWiresharkError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/workflow/executions/${selected?.id}/artifacts/${artifact.artifactId}/open-wireshark`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!data.success) {
        setWiresharkError(data.message || "Failed to open Wireshark.");
      }
    } catch (err) {
      console.error("Wireshark launch error:", err);
      setWiresharkError("Failed to communicate with agent backend.");
    } finally {
      setWiresharkOpening(false);
    }
  };

  const handleCopy = () => {
    if (!viewingContent) return;
    navigator.clipboard.writeText(viewingContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasActiveExecutions = executions.some(
    e => e.status === 'running' || e.status === 'pending' || e.status === 'retrying' || e.status === 'queued'
  );

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (hasActiveExecutions) {
      pollRef.current = setInterval(() => {
        refreshEx();
        refreshStats();
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [hasActiveExecutions, refreshEx, refreshStats]);

  const filtered = executions.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !search || (e.name || "").toLowerCase().includes(q) || (e.type || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchQ && matchStatus;
  });

  const pagination = usePagination({ initialLimit: 20, initialTotal: filtered.length });
  const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

  function handleRefresh() {
    refreshEx();
    refreshStats();
  }

  const loading = exLoading || statsLoading;

  if (exLoading) return (
    <div className="p-6">
      <div className="h-7 w-48 bg-surface-2 rounded animate-pulse mb-5" />
      <div className="grid grid-cols-4 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-surface-2 rounded-xl animate-pulse" />)}
      </div>
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-surface-2 rounded-xl mb-2 animate-pulse" />)}
    </div>
  );

  if (exError) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[40vh]">
      <p className="text-red-400 text-sm mb-3">{exError}</p>
      <button onClick={handleRefresh} className="text-xs text-accent hover:underline">Retry</button>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">Execution Monitor</h1>
          <p className="text-muted text-xs mt-0.5">
            Playbook executions
            {hasActiveExecutions && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                auto-refreshing
              </span>
            )}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={loading} className="flex items-center gap-2 px-3 py-2 text-xs border border-border rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-all disabled:opacity-50">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={loading ? "animate-spin" : ""}>
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-surface border border-border rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-400/60 mb-1">Running</p>
            <p className="text-2xl font-bold text-green-400">{statistics.runningExecutions}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted/50 mb-1">Completed</p>
            <p className="text-2xl font-bold text-foreground">{statistics.completedCases}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/60 mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-400">{statistics.failedExecutions}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent/60 mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-accent">{statistics.successRate}%</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/60 mb-1">Avg Duration</p>
            <p className="text-lg font-bold text-yellow-400">{formatDuration(statistics.averageDuration)}</p>
          </div>
        </div>
      )}

      {executions.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-2xl">📊</div>
          <p className="text-foreground font-medium mb-1">No Executions Yet</p>
          <p className="text-muted text-sm max-w-xs">Executions appear here when this playbook is triggered.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search executions..." className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
              {STATUS_FILTER_OPTIONS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
            </select>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted">Execution</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden sm:table-cell">Started</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden md:table-cell">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden lg:table-cell">Progress</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted text-sm">No results</td></tr>
                ) : paginated.map(e => {
                  const st = STATUS_STYLE[e.status] ?? STATUS_STYLE.pending;
                  const isSelected = selected?.id === e.id;
                  return (
                    <tr key={e.id} onClick={() => select(isSelected ? null : e)} className={`border-b border-border last:border-0 cursor-pointer transition-colors ${isSelected ? "bg-accent/5" : "hover:bg-surface-2/60"}`}>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-foreground">{e.name}</p>
                        {e.triggeredBy && <p className="text-xs text-muted">by {e.triggeredBy}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted capitalize">{e.type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted">{e.startedAt ? new Date(e.startedAt).toLocaleTimeString() : '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs font-mono text-muted">{formatDuration(e.duration)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {e.progress !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-surface-2 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-accent" style={{ width: `${e.progress}%` }} />
                            </div>
                            <span className="text-xs font-mono text-muted">{e.progress}%</span>
                          </div>
                        ) : <span className="text-xs text-muted">—</span>}
                        {e.currentStep && (
                          <p className="text-[10px] text-accent truncate max-w-[120px] mt-0.5">{e.currentStep}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border p-4 text-xs text-muted bg-surface-2">
                <span>Showing {pagination.offset + 1}–{Math.min(filtered.length, pagination.offset + pagination.limit)} of {filtered.length}</span>
                <div className="flex gap-2">
                  <button onClick={pagination.prevPage} disabled={!pagination.hasPrevPage} className="px-2.5 py-1.5 border border-border rounded-lg bg-surface disabled:opacity-50">Previous</button>
                  <button onClick={pagination.nextPage} disabled={!pagination.hasNextPage} className="px-2.5 py-1.5 border border-border rounded-lg bg-surface disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </div>

          {selected && (() => {
            const sel = selected as any;
            const variables = sel.variables ?? {};
            const artifacts: any[] = sel.artifacts ?? [];
            const stepOutputs = sel.stepOutputs ?? {};
            const timelineEvents: any[] = sel.timelineEvents ?? [];
            const varEntries = Object.entries(variables);
            const stepOutputEntries = Object.entries(stepOutputs);

            return (
              <div className="mt-5 bg-surface border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{sel.name}</p>
                    {sel.currentStep && (
                      <p className="text-xs text-muted mt-1">
                        Current Step: <span className="text-accent font-semibold">{sel.currentStep}</span>
                      </p>
                    )}
                  </div>
                  <button onClick={() => select(null)} className="text-muted hover:text-foreground text-sm">✕</button>
                </div>

                {sel.error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">{sel.error}</div>}

                {/* Executor Monitor */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface-2/40 border border-border rounded-xl p-4 text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-0.5">Current Executor</p>
                    <p className="font-semibold text-foreground font-mono truncate">{sel.currentExecutor || 'ManualExecutor'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-0.5">Current Action</p>
                    <p className="font-semibold text-foreground truncate">{sel.currentAction || 'Idle'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-0.5">Artifacts</p>
                    <p className="font-semibold text-foreground font-mono">{sel.artifactsCount ?? artifacts.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-0.5">Duration</p>
                    <p className="font-semibold text-foreground font-mono">{formatDuration(sel.duration)}</p>
                  </div>
                </div>

                {sel.returnedSummary && (
                  <div className="bg-accent/5 border border-accent/10 rounded-xl p-4 text-xs space-y-1">
                    <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Returned Summary</p>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{sel.returnedSummary}</p>
                  </div>
                )}

                {/* ── Variables panel ──────────────────────────────────────── */}
                <ExpandablePanel
                  title="Variables"
                  badge={varEntries.length}
                  badgeColor={varEntries.length > 0 ? "text-accent" : "text-muted"}
                  defaultOpen={varEntries.length > 0}
                >
                  {varEntries.length === 0 ? (
                    <p className="text-xs text-muted italic">No variables set yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {varEntries.map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-xs font-mono">
                          <span className="text-accent/80 shrink-0 min-w-[8rem] truncate">{k}</span>
                          <span className="text-muted">=</span>
                          <span className="text-foreground/80 truncate">
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </ExpandablePanel>

                {/* ── Premium Execution Outputs Section (When COMPLETED and has artifacts) ── */}
                {(() => {
                  const isCompleted = sel.status.toLowerCase() === 'completed';
                  const artifactsToUse = enrichedArtifacts.length > 0 ? enrichedArtifacts : artifacts;
                  const showExecutionOutputs = isCompleted && artifactsToUse.length > 0;
                  
                  if (showExecutionOutputs) {
                    return (
                      <div className="border border-border rounded-xl overflow-hidden bg-surface-2/30">
                        <div className="px-4 py-3 bg-surface-2 border-b border-border flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                            📦 Execution Outputs
                          </span>
                          <span className="text-xs font-mono font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                            {artifactsToUse.length} file{artifactsToUse.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="p-4 space-y-3">
                          {artifactsToUse.map((a: any) => (
                            <div key={a.artifactId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border rounded-xl p-4 transition-all hover:border-accent/40">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-2 border border-border text-xs font-bold font-mono">
                                  {getArtifactIcon(a.type)}
                                </div>
                                <div className="space-y-0.5 max-w-[280px] sm:max-w-[400px]">
                                  <p className="text-xs font-bold text-foreground truncate">{a.name}</p>
                                  <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted">
                                    <span className="uppercase font-semibold text-accent/80">{a.type}</span>
                                    <span>•</span>
                                    <span>Generated by <span className="text-foreground/75 font-mono">{a.producerExecutor || 'UnknownExecutor'}</span></span>
                                    <span>•</span>
                                    <span>{formatFileSize(a.metadata?.fileSize)}</span>
                                    <span>•</span>
                                    <span>{formatTimestamp(a.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <button
                                  onClick={() => handleView(a)}
                                  className="px-3 py-1.5 text-xs border border-border rounded-lg bg-surface-2 hover:bg-surface hover:text-foreground text-muted transition-colors font-medium"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleDownload(a)}
                                  className="px-3 py-1.5 text-xs bg-accent hover:bg-accent/90 text-accent-foreground font-medium rounded-lg transition-colors"
                                >
                                  Download
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  
                  // Hide completely if completed but no artifacts
                  if (isCompleted) return null;
                  
                  // Fallback section for non-completed states if artifacts exist
                  if (artifacts.length > 0) {
                    return (
                      <ExpandablePanel
                        title="Artifacts"
                        badge={artifacts.length}
                        badgeColor="text-yellow-400"
                        defaultOpen={artifacts.length > 0}
                      >
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {artifacts.map((a: any) => (
                            <div key={a.artifactId} className="bg-surface-2/60 border border-border rounded-lg p-3 text-xs space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-foreground truncate">{a.name}</span>
                                <span className="text-[10px] font-mono bg-surface px-1.5 py-0.5 rounded border border-border text-muted shrink-0">{a.type}</span>
                              </div>
                              <div className="text-muted font-mono text-[10px]">id: {a.artifactId}</div>
                              {a.producerExecutor && (
                                <div className="text-muted/70">executor: <span className="text-foreground/70">{a.producerExecutor}</span></div>
                              )}
                              {a.metadata && Object.keys(a.metadata).length > 0 && (
                                <div className="text-muted/60 truncate">
                                  {Object.entries(a.metadata).map(([mk, mv]) =>
                                    <span key={mk} className="mr-2">{mk}: <span className="text-foreground/60">{String(mv)}</span></span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ExpandablePanel>
                    );
                  }
                  
                  return null;
                })()}

                {/* ── Step Outputs panel ───────────────────────────────────── */}
                <ExpandablePanel
                  title="Step Outputs"
                  badge={stepOutputEntries.length}
                  badgeColor={stepOutputEntries.length > 0 ? "text-green-400" : "text-muted"}
                  defaultOpen={stepOutputEntries.length > 0}
                >
                  {stepOutputEntries.length === 0 ? (
                    <p className="text-xs text-muted italic">No step outputs yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {stepOutputEntries.map(([stepId, output]: [string, any]) => (
                        <div key={stepId} className="bg-surface-2/60 border border-border rounded-lg p-3 text-xs">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-foreground truncate">
                              {output?.title || output?.stepTitle || stepId}
                            </span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              output?.status === 'EXECUTED' || output?.status === 'completed'
                                ? 'bg-accent/10 text-accent'
                                : output?.status === 'FAILED'
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-surface text-muted border border-border'
                            }`}>{output?.status || '—'}</span>
                          </div>
                          <pre className="text-muted/80 font-mono text-[10px] whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                            {JSON.stringify(output?.outputs ?? output, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </ExpandablePanel>

                {/* ── Logs panel ───────────────────────────────────────────── */}
                {sel.logs && sel.logs.length > 0 && (
                  <ExpandablePanel title="Logs" badge={sel.logs.length} defaultOpen={true}>
                    <div className="bg-black/40 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
                      {sel.logs.map((l: any, i: number) => (
                        <div key={i} className={l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-yellow-400' : 'text-green-400'}>
                          <span className="text-muted/50">[{new Date(l.timestamp).toLocaleTimeString()}]</span> {l.message}
                        </div>
                      ))}
                    </div>
                  </ExpandablePanel>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* ── Built-in Interactive Viewer Modal ── */}
      {viewingArtifact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-2 border border-border text-xs font-bold font-mono">
                  {getArtifactIcon(viewingArtifact.type)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">{viewingArtifact.name}</h3>
                  <p className="text-[10px] text-muted uppercase tracking-wider">{viewingArtifact.type} artifact</p>
                </div>
              </div>
              <button
                onClick={() => { setViewingArtifact(null); setViewingContent(null); }}
                className="text-muted hover:text-foreground text-lg transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 min-h-[200px] flex flex-col">
              {viewingLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs text-muted">Loading content...</p>
                </div>
              ) : (() => {
                const type = viewingArtifact.type.toLowerCase();
                
                if (type === 'pcap' || type === 'pcapng') {
                  const meta = viewingArtifact.metadata || {};
                  return (
                    <div className="space-y-6 max-w-lg mx-auto py-4">
                      <div className="bg-surface-2 border border-border rounded-xl p-5 space-y-4">
                        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted">PCAP Capture Metadata</h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-muted mb-0.5">Interface</p>
                            <p className="font-semibold text-foreground">{meta.interface || '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted mb-0.5">Capture Filter</p>
                            <p className="font-semibold text-foreground font-mono truncate max-w-[180px]">{meta.captureFilter || 'None'}</p>
                          </div>
                          <div>
                            <p className="text-muted mb-0.5">Duration</p>
                            <p className="font-semibold text-foreground">{meta.duration !== undefined ? `${meta.duration} seconds` : '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted mb-0.5">Packet Count</p>
                            <p className="font-semibold text-foreground font-mono">{meta.packetCount !== undefined ? meta.packetCount.toLocaleString() : '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted mb-0.5">File Size</p>
                            <p className="font-semibold text-foreground font-mono">{formatFileSize(meta.fileSize)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {viewingArtifact.wiresharkSupported && (
                          <button
                            onClick={() => handleOpenInWireshark(viewingArtifact)}
                            disabled={wiresharkOpening}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-750 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-xs"
                          >
                            {wiresharkOpening ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Opening Wireshark...
                              </>
                            ) : (
                              <>🌐 Open in Wireshark</>
                            )}
                          </button>
                        )}
                        {wiresharkError && (
                          <p className="text-red-450 text-[11px] text-center font-medium">{wiresharkError}</p>
                        )}
                        <button
                          onClick={() => handleDownload(viewingArtifact)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-surface hover:bg-surface-hover text-foreground font-semibold rounded-xl transition-colors text-xs"
                        >
                          📥 Download Capture File
                        </button>
                      </div>
                    </div>
                  );
                }

                if (type === 'pdf') {
                  const viewUrl = `/api/projects/${projectId}/workflow/executions/${selected?.id}/artifacts/${viewingArtifact.artifactId}/view`;
                  return (
                    <iframe
                      src={viewUrl}
                      className="w-full h-[60vh] border border-border rounded-xl bg-surface-2"
                      title={viewingArtifact.name}
                    />
                  );
                }

                if (type.startsWith('image') || ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(type)) {
                  const viewUrl = `/api/projects/${projectId}/workflow/executions/${selected?.id}/artifacts/${viewingArtifact.artifactId}/view`;
                  return (
                    <div className="flex-1 flex items-center justify-center">
                      <img
                        src={viewUrl}
                        className="max-w-full max-h-[60vh] object-contain rounded-xl border border-border bg-surface-2"
                        alt={viewingArtifact.name}
                      />
                    </div>
                  );
                }

                if (type === 'markdown' || type === 'report') {
                  return (
                    <div className="prose prose-invert max-w-none text-xs select-text overflow-x-auto">
                      {renderMarkdown(viewingContent || '')}
                    </div>
                  );
                }

                if (type === 'json') {
                  return (
                    <pre className="flex-1 font-mono text-xs text-foreground bg-surface-2 p-4 rounded-xl border border-border overflow-auto max-h-[60vh] whitespace-pre-wrap select-text">
                      {viewingContent}
                    </pre>
                  );
                }

                if (type === 'csv') {
                  const rows = viewingContent ? parseCSV(viewingContent) : [];
                  if (rows.length === 0) return <p className="text-xs text-muted italic">Empty table.</p>;
                  const headers = rows[0];
                  const bodyRows = rows.slice(1);
                  return (
                    <div className="border border-border rounded-xl overflow-hidden bg-surface-2 max-h-[60vh] overflow-y-auto">
                      <table className="w-full text-xs text-left border-collapse select-text">
                        <thead>
                          <tr className="border-b border-border bg-surface">
                            {headers.map((h, i) => (
                              <th key={i} className="px-4 py-2 font-semibold text-muted border-r border-border last:border-0">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bodyRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-border last:border-0 hover:bg-surface/30">
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="px-4 py-2 text-foreground border-r border-border last:border-0">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                return (
                  <pre className="flex-1 font-mono text-xs text-foreground bg-surface-2 p-4 rounded-xl border border-border overflow-auto max-h-[60vh] whitespace-pre-wrap select-text">
                    {viewingContent || 'No preview content.'}
                  </pre>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-surface-2 flex items-center justify-between text-xs">
              <div className="text-muted font-mono text-[10px]">
                ID: {viewingArtifact.artifactId}
              </div>
              <div className="flex gap-2">
                {isTextBased(viewingArtifact.type) && (
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover text-foreground font-medium transition-colors"
                  >
                    {copied ? "Copied!" : "Copy to Clipboard"}
                  </button>
                )}
                <button
                  onClick={() => handleDownload(viewingArtifact)}
                  className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-accent-foreground font-medium rounded-lg transition-colors"
                >
                  Download Original
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Execution Outputs Custom Helpers ───────────────────────────────────────────

function getArtifactIcon(type: string): string {
  const t = type.toLowerCase();
  if (t === 'markdown' || t === 'report') return '📝';
  if (t === 'json') return '{ }';
  if (t === 'xml') return 'XML';
  if (t === 'pcap' || t === 'pcapng') return '🌐';
  if (t === 'csv') return '📊';
  if (t === 'pdf') return '📕';
  if (t.startsWith('image') || ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(t)) return '🖼️';
  return '📄';
}

function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '—';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTimestamp(isoStr?: string): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return isoStr;
  }
}

function isTextBased(type: string): boolean {
  const t = type.toLowerCase();
  return ['markdown', 'report', 'json', 'txt', 'xml', 'csv'].includes(t);
}

function parseCSV(text: string): string[][] {
  const lines = text.split('\n');
  return lines
    .map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map(cell => cell.replace(/^"|"$/g, '').trim());
    })
    .filter(row => row.length > 0 && row.some(cell => cell !== ""));
}

function inlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const content = part.slice(3, -3).trim();
      const lines = content.split("\n");
      const firstLine = lines[0] || "";
      const hasLanguage = !firstLine.includes(" ") && firstLine.length > 0 && firstLine.length < 15;
      const language = hasLanguage ? firstLine : "code";
      const code = hasLanguage ? lines.slice(1).join("\n") : content;

      return (
        <div key={index} className="my-3 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-inner">
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-surface border-b border-border text-xs text-muted font-mono">
            <span className="capitalize">{language}</span>
          </div>
          <pre className="p-3.5 overflow-x-auto font-mono text-xs leading-relaxed text-foreground select-text">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    const lines = part.split("\n");
    return lines.map((line, lineIdx) => {
      const key = `${index}-${lineIdx}`;

      if (/^[-*]\s/.test(line)) {
        const content = line.replace(/^[-*]\s/, "");
        return (
          <div key={key} className="flex gap-2 mb-1 pl-1">
            <span className="text-accent shrink-0 select-none">•</span>
            <span className="text-foreground">{inlineFormatting(content)}</span>
          </div>
        );
      }

      if (/^#{1,4}\s/.test(line)) {
        const level = (line.match(/^#+/) || ["#"])[0].length;
        const content = line.replace(/^#+\s/, "");
        const sizeClass = level === 1 ? "text-lg font-bold" : level === 2 ? "text-base font-semibold" : "text-sm font-semibold";
        return (
          <p key={key} className={`${sizeClass} text-foreground mt-3 mb-1.5`}>
            {inlineFormatting(content)}
          </p>
        );
      }

      if (line.trim() === "") {
        return <div key={key} className="h-2" />;
      }

      return (
        <p key={key} className="mb-1 leading-relaxed">
          {inlineFormatting(line)}
        </p>
      );
    });
  });
}
