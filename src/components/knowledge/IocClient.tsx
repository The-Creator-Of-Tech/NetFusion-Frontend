"use client";

import { useEffect, useState } from "react";
import { knowledgeStore } from "@/store/knowledge";
import type { IocRecord, IocType, Reputation } from "@/types/api";
import { usePagination } from "@/hooks/usePagination";

const TYPE_ICONS: Record<IocType, React.ReactNode> = {
  ip:       <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/></svg>,
  domain:   <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8ZM6.5 1.84c-.58.62-1.08 1.44-1.46 2.41H2.66a6.52 6.52 0 0 1 3.84-2.41ZM2 8c0-.56.07-1.1.19-1.62h3.04A13.2 13.2 0 0 0 5.1 8c0 .56.04 1.1.12 1.62H2.19A6.44 6.44 0 0 1 2 8Zm.66 3.75h2.38c.38.97.88 1.79 1.46 2.41A6.52 6.52 0 0 1 2.66 11.75Z"/></svg>,
  url:      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 2 2 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a2 2 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 2 2 0 0 0-2.83 0l-2.5 2.5a2.002 2.002 0 0 0 0 2.83Z"/></svg>,
  hash:     <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3 1.5a.5.5 0 0 1 1 0V4h3V1.5a.5.5 0 0 1 1 0V4h3V1.5a.5.5 0 0 1 1 0V4H14a.5.5 0 0 1 0 1h-1.5v3H14a.5.5 0 0 1 0 1h-1.5v3H14a.5.5 0 0 1 0 1h-1.5v2.5a.5.5 0 0 1-1 0V13H8v2.5a.5.5 0 0 1-1 0V13H4v2.5a.5.5 0 0 1-1 0V13H1.5a.5.5 0 0 1 0-1H3v-3H1.5a.5.5 0 0 1 0-1H3V5H1.5a.5.5 0 0 1 0-1H3V1.5Z"/></svg>,
  email:    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25v-8.5C0 2.784.784 2 1.75 2ZM1.5 12.251c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V5.329L8.38 8.93a.75.75 0 0 1-.76 0L1.5 5.329v6.922Zm13-8.181v-.32a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25v.32L8 7.88Z"/></svg>,
  filename: <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688Z"/></svg>,
};

const REP_STYLE: Record<Reputation, { bg: string; text: string; border: string }> = {
  malicious:  { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20" },
  suspicious: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  benign:     { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/20" },
  unknown:    { bg: "bg-surface-2",     text: "text-muted",      border: "border-border" },
};

const TYPE_BADGE_COLOR: Record<IocType, string> = {
  ip:       "text-blue-400 bg-blue-500/10 border-blue-500/20",
  domain:   "text-purple-400 bg-purple-500/10 border-purple-500/20",
  url:      "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  hash:     "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  email:    "text-pink-400 bg-pink-500/10 border-pink-500/20",
  filename: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

interface Props { projectId: string }

export default function IocClient({ projectId }: Props) {
  const state = knowledgeStore.useStore();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [repFilter, setRepFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<IocRecord | null>(null);

  useEffect(() => { knowledgeStore.loadIoc(projectId); }, [projectId]);

  const records = state.iocRecords;
  const loading = state.loading.ioc;
  const error = state.error.ioc;

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.value.toLowerCase().includes(q) || (r.source ?? "").toLowerCase().includes(q) || (r.matchedRule ?? "").toLowerCase().includes(q);
    const matchType = typeFilter === "ALL" || r.type === typeFilter;
    const matchRep = repFilter === "ALL" || r.reputation === repFilter;
    return matchSearch && matchType && matchRep;
  });

  const pagination = usePagination({ initialLimit: 20, initialTotal: filtered.length });
  const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

  const repCounts = records.reduce((acc, r) => {
    acc[r.reputation ?? "unknown"] = (acc[r.reputation ?? "unknown"] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <div className="p-6 space-y-3">{Array.from({length:8}).map((_,i) => <div key={i} className="h-10 bg-surface-2 rounded animate-pulse" />)}</div>;
  if (error) return <div className="p-6 text-center"><p className="text-danger text-sm mb-2">{error}</p><button onClick={() => knowledgeStore.loadIoc(projectId)} className="text-xs text-accent hover:underline">Retry</button></div>;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">IOC Explorer</h1>
          <p className="text-muted text-xs mt-0.5">{records.length} indicator{records.length !== 1 ? "s" : ""} of compromise</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-muted">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/></svg>
          </div>
          <p className="text-foreground font-medium mb-1">No IOCs Detected</p>
          <p className="text-muted text-sm max-w-xs">Analyze network traffic to extract indicators of compromise.</p>
        </div>
      ) : (
        <div className="flex gap-5">
          <div className="flex-1 min-w-0">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {(["malicious", "suspicious", "benign", "unknown"] as Reputation[]).map((rep) => {
                const s = REP_STYLE[rep];
                return (
                  <div key={rep} onClick={() => setRepFilter(repFilter === rep ? "ALL" : rep)} className={`cursor-pointer rounded-xl border p-3 transition-all ${repFilter === rep ? `${s.bg} ${s.border} ring-1 ring-current` : "border-border bg-surface hover:bg-surface-2"}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${s.text}`}>{rep}</p>
                    <p className={`text-xl font-bold ${s.text}`}>{repCounts[rep] ?? 0}</p>
                  </div>
                );
              })}
            </div>

            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search IOC value, source..." className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors" />
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-colors">
                <option value="ALL">All Types</option>
                {(["ip","domain","url","hash","email","filename"] as IocType[]).map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>

            {/* List */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {paginated.length === 0 ? (
                <div className="py-12 text-center text-muted text-sm">No results</div>
              ) : (
                <div className="divide-y divide-border">
                  {paginated.map((ioc) => {
                    const safeType = (ioc.type && TYPE_ICONS[ioc.type as IocType]) ? ioc.type as IocType : "filename";
                    const rep = REP_STYLE[ioc.reputation ?? "unknown"] ?? REP_STYLE.unknown;
                    const typeBadge = TYPE_BADGE_COLOR[safeType];
                    const isSelected = selected?.id === ioc.id;
                    return (
                      <div key={ioc.id} onClick={() => setSelected(isSelected ? null : ioc)} className={`px-4 py-3 cursor-pointer transition-colors flex items-center gap-3 ${isSelected ? "bg-accent/5" : "hover:bg-surface-2/60"}`}>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${typeBadge}`}>
                          {TYPE_ICONS[safeType]}
                          {safeType.toUpperCase()}
                        </span>
                        <span className="flex-1 font-mono text-xs text-foreground truncate">{ioc.value}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${rep.bg} ${rep.text} ${rep.border}`}>{ioc.reputation ?? "unknown"}</span>
                        {ioc.confidence !== undefined && ioc.confidence !== null && (
                          <span className="text-xs text-muted hidden sm:inline">{ioc.confidence}%</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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

          {/* Detail panel */}
          {selected && (() => {
            const safeSelectedType: IocType = (selected.type && TYPE_ICONS[selected.type as IocType]) ? selected.type as IocType : "filename";
            const selRep = REP_STYLE[selected.reputation ?? "unknown"] ?? REP_STYLE.unknown;
            return (
            <div className="w-72 shrink-0 bg-surface border border-border rounded-xl p-5 h-fit sticky top-4 space-y-4">
              <div className="flex items-start justify-between">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_BADGE_COLOR[safeSelectedType]}`}>
                  {TYPE_ICONS[safeSelectedType]} {safeSelectedType.toUpperCase()}
                </span>
                <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground transition-colors">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
                </button>
              </div>
              <div className="bg-surface-2 rounded-lg p-3 break-all">
                <p className="text-xs font-mono text-foreground">{selected.value}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-2 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted mb-0.5">Reputation</p>
                  <p className={`text-xs font-bold ${selRep.text}`}>{selected.reputation ?? "unknown"}</p>
                </div>
                <div className="bg-surface-2 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted mb-0.5">Confidence</p>
                  <p className="text-xs font-bold text-foreground">{selected.confidence !== undefined && selected.confidence !== null ? `${selected.confidence}%` : "—"}</p>
                </div>
              </div>
              {selected.source && <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Source</p><p className="text-xs text-foreground">{selected.source}</p></div>}
              {selected.matchedRule && <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Matched Rule</p><p className="text-xs text-foreground font-mono">{selected.matchedRule}</p></div>}
              {selected.description && <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Description</p><p className="text-xs text-foreground leading-relaxed">{selected.description}</p></div>}
              {(selected.tags ?? []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {(selected.tags ?? []).map((tag) => <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted">{tag}</span>)}
                  </div>
                </div>
              )}
              {(selected.threatLinks ?? []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Threat Links</p>
                  <div className="flex flex-wrap gap-1">
                    {(selected.threatLinks ?? []).map((tl) => <span key={tl} className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">{tl}</span>)}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Status: <span className="text-foreground">{selected.status ?? "active"}</span></span>
              </div>
            </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
