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

                {/* ── Artifacts panel ──────────────────────────────────────── */}
                <ExpandablePanel
                  title="Artifacts"
                  badge={artifacts.length}
                  badgeColor={artifacts.length > 0 ? "text-yellow-400" : "text-muted"}
                  defaultOpen={artifacts.length > 0}
                >
                  {artifacts.length === 0 ? (
                    <p className="text-xs text-muted italic">No artifacts produced yet.</p>
                  ) : (
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
                  )}
                </ExpandablePanel>

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
    </div>
  );
}
