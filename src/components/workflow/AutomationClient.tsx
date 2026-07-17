"use client";

import { useState } from "react";
import { useAutomation } from "@/hooks/useAutomation";
import { usePagination } from "@/hooks/usePagination";
import type { AutomationStatus } from "@/types/api";

interface Props { projectId: string }

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  running:   { bg: "bg-green-500/10",  text: "text-green-400",  dot: "bg-green-400 animate-pulse" },
  completed: { bg: "bg-accent/10",     text: "text-accent",     dot: "bg-accent" },
  failed:    { bg: "bg-red-500/10",    text: "text-red-400",    dot: "bg-red-400" },
  pending:   { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
  cancelled: { bg: "bg-surface-2",     text: "text-muted",      dot: "bg-muted" },
  paused:    { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" },
  retrying:  { bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-400 animate-pulse" },
  scheduled: { bg: "bg-blue-500/10",   text: "text-blue-400",   dot: "bg-blue-400" },
};

const STATUS_FILTERS: (AutomationStatus | 'ALL')[] = ['ALL','running','completed','failed','pending','cancelled','scheduled'];

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export default function AutomationClient({ projectId }: Props) {
  const { automations, loading, error, refresh, stop, retry, resume, cancel, select, selected } = useAutomation(projectId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AutomationStatus | 'ALL'>('ALL');

  const filtered = automations.filter(a => {
    const q = search.toLowerCase();
    const matchQ = !search || (a.name || "").toLowerCase().includes(q) || (a.playbookName ?? "").toLowerCase().includes(q) || (a.trigger || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchQ && matchStatus;
  });

  const pagination = usePagination({ initialLimit: 20, initialTotal: filtered.length });
  const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

  const runningCount = automations.filter(a => a.status === 'running').length;
  const failedCount = automations.filter(a => a.status === 'failed').length;
  const completedCount = automations.filter(a => a.status === 'completed').length;

  if (loading) return (
    <div className="p-6">
      <div className="h-7 w-36 bg-surface-2 rounded animate-pulse mb-5" />
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-surface-2 rounded-xl mb-2 animate-pulse" />)}
    </div>
  );

  if (error) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[40vh]">
      <p className="text-red-400 text-sm mb-3">{error}</p>
      <button onClick={refresh} className="text-xs text-accent hover:underline">Retry</button>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">Automation</h1>
          <p className="text-muted text-xs mt-0.5">{automations.length} automation run{automations.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={refresh} className="px-3 py-2 text-xs border border-border rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-all">Refresh</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-400/60 mb-1">Running</p>
          <p className="text-xl font-bold text-green-400">{runningCount}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted/50 mb-1">Completed</p>
          <p className="text-xl font-bold text-foreground">{completedCount}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/60 mb-1">Failed</p>
          <p className="text-xl font-bold text-red-400">{failedCount}</p>
        </div>
      </div>

      {automations.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-2xl">🤖</div>
          <p className="text-foreground font-medium mb-1">No Automations Running</p>
          <p className="text-muted text-sm max-w-xs">Execute a playbook or trigger a rule to start an automation.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search automations..." className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
              {STATUS_FILTERS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
            </select>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted">Automation</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden sm:table-cell">Trigger</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden md:table-cell">Progress</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden lg:table-cell">Duration</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted text-sm">No results</td></tr>
                ) : paginated.map(a => {
                  const st = STATUS_STYLE[a.status] ?? STATUS_STYLE.pending;
                  const isSelected = selected?.id === a.id;
                  return (
                    <tr key={a.id} onClick={() => select(isSelected ? null : a)} className={`border-b border-border last:border-0 cursor-pointer transition-colors ${isSelected ? "bg-accent/5" : "hover:bg-surface-2/60"}`}>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-foreground">{a.name}</p>
                        {a.triggeredByName && <p className="text-xs text-muted">by {a.triggeredByName}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted capitalize">{a.trigger}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {a.progress !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-surface-2 rounded-full h-1.5 w-20">
                              <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${a.progress}%` }} />
                            </div>
                            <span className="text-xs font-mono text-muted">{a.progress}%</span>
                          </div>
                        ) : <span className="text-xs text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs font-mono text-muted">{formatDuration(a.duration)}</td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {a.status === 'running' && <button onClick={() => stop(a.id)} title="Stop" className="p-1.5 text-xs text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">■</button>}
                          {a.status === 'paused' && <button onClick={() => resume(a.id)} title="Resume" className="p-1.5 text-xs text-muted hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all">▶</button>}
                          {a.status === 'failed' && <button onClick={() => retry(a.id)} title="Retry" className="p-1.5 text-xs text-muted hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all">↺</button>}
                          {(a.status === 'running' || a.status === 'pending' || a.status === 'scheduled') && (
                            <button onClick={() => cancel(a.id)} title="Cancel" className="p-1.5 text-xs text-muted hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all">✕</button>
                          )}
                        </div>
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
                  <button onClick={pagination.prevPage} disabled={!pagination.hasPrevPage} className="px-2.5 py-1.5 border border-border rounded-lg bg-surface disabled:opacity-50 transition-all">Previous</button>
                  <button onClick={pagination.nextPage} disabled={!pagination.hasNextPage} className="px-2.5 py-1.5 border border-border rounded-lg bg-surface disabled:opacity-50 transition-all">Next</button>
                </div>
              </div>
            )}
          </div>

          {selected && (
            <div className="mt-5 bg-surface border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <p className="text-sm font-bold text-foreground">{selected.name}</p>
                <button onClick={() => select(null)} className="text-muted hover:text-foreground transition-colors text-xs">✕</button>
              </div>
              {selected.error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">{selected.error}</div>}
              {selected.logs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-2">Logs</p>
                  <div className="bg-black/40 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                    {selected.logs.map((l, i) => (
                      <div key={i} className={`text-xs font-mono ${l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-yellow-400' : 'text-green-400'}`}>
                        <span className="text-muted/50">[{new Date(l.timestamp).toLocaleTimeString()}]</span> {l.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
