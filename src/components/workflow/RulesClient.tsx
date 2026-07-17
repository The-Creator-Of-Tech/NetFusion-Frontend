"use client";

import { useState } from "react";
import { useRules } from "@/hooks/useRules";
import { usePagination } from "@/hooks/usePagination";
import type { Rule, RuleCategory, RuleSeverity } from "@/types/api";

interface Props { projectId: string }

const SEV_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20" },
  high:     { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  medium:   { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  low:      { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/20" },
  info:     { bg: "bg-surface-2",     text: "text-muted",      border: "border-border" },
};

const CATEGORIES: RuleCategory[] = ["detection","response","compliance","enrichment","correlation","custom"];
const SEVERITIES: RuleSeverity[] = ["critical","high","medium","low","info"];

export default function RulesClient({ projectId }: Props) {
  const { rules, loading, error, refresh, remove, setEnabled, select, selected } = useRules(projectId);
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("ALL");
  const [catFilter, setCatFilter] = useState("ALL");

  const filtered = rules.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !search || (r.name || "").toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q);
    const matchSev = sevFilter === "ALL" || r.severity === sevFilter;
    const matchCat = catFilter === "ALL" || r.category === catFilter;
    return matchQ && matchSev && matchCat;
  });

  const pagination = usePagination({ initialLimit: 20, initialTotal: filtered.length });
  const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

  if (loading) return (
    <div className="p-6">
      <div className="h-7 w-32 bg-surface-2 rounded animate-pulse mb-5" />
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-surface-2 rounded-xl mb-2 animate-pulse" />)}
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
          <h1 className="text-lg font-bold text-foreground">Rules</h1>
          <p className="text-muted text-xs mt-0.5">{rules.length} rule{rules.length !== 1 ? "s" : ""} configured</p>
        </div>
        <button onClick={refresh} className="px-3 py-2 text-xs border border-border rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-all">Refresh</button>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-2xl">⚡</div>
          <p className="text-foreground font-medium mb-1">No Rules Configured</p>
          <p className="text-muted text-sm max-w-xs">Rules automatically trigger actions when conditions are met during analysis.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules..." className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors" />
            </div>
            <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="ALL">All Severities</option>
              {SEVERITIES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="ALL">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex gap-5">
            <div className="flex-1 min-w-0">
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted">Rule</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted">Severity</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden sm:table-cell">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden md:table-cell">Conditions</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden lg:table-cell">Triggers</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-muted">Enabled</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-muted text-sm">No results</td></tr>
                    ) : paginated.map(r => {
                      const sev = SEV_STYLE[r.severity] ?? SEV_STYLE.info;
                      const isSelected = selected?.id === r.id;
                      return (
                        <tr key={r.id} onClick={() => select(isSelected ? null : r)} className={`border-b border-border last:border-0 cursor-pointer transition-colors ${isSelected ? "bg-accent/5" : "hover:bg-surface-2/60"}`}>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-foreground">{r.name}</p>
                            {r.description && <p className="text-xs text-muted truncate max-w-xs mt-0.5">{r.description}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${sev.bg} ${sev.text} ${sev.border}`}>{r.severity.toUpperCase()}</span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted capitalize">{r.category}</td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs font-mono text-muted">{r.conditions.length}</td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs font-mono text-muted">{r.triggerCount}</td>
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setEnabled(r.id, !r.enabled)} className={`relative inline-flex w-8 h-4 rounded-full transition-colors ${r.enabled ? "bg-accent" : "bg-surface-2 border border-border"}`}>
                              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${r.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <button onClick={() => remove(r.id)} className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-xs">🗑</button>
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
            </div>

            {selected && (
              <div className="w-72 shrink-0 bg-surface border border-border rounded-xl p-5 h-fit sticky top-4 space-y-4">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-bold text-foreground">{selected.name}</p>
                  <button onClick={() => select(null)} className="text-muted hover:text-foreground transition-colors">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
                  </button>
                </div>
                {selected.description && <p className="text-xs text-muted leading-relaxed">{selected.description}</p>}
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-2">Conditions ({selected.conditions.length})</p>
                  {selected.conditions.length === 0 ? <p className="text-xs text-muted">No conditions</p> : (
                    <div className="space-y-1">
                      {selected.conditions.map(c => (
                        <div key={c.id} className="bg-surface-2 rounded-lg px-3 py-2 text-xs font-mono text-foreground">
                          {c.field} <span className="text-muted">{c.operator}</span> {String(c.value ?? '')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-2">Actions ({selected.actions.length})</p>
                  {selected.actions.length === 0 ? <p className="text-xs text-muted">No actions</p> : (
                    <div className="space-y-1">
                      {selected.actions.map(a => (
                        <div key={a.id} className="bg-surface-2 rounded-lg px-3 py-2 text-xs text-foreground capitalize">{a.type.replace(/_/g, ' ')}</div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted">Last triggered: {selected.lastExecuted ? new Date(selected.lastExecuted).toLocaleDateString() : 'Never'}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
