"use client";

import { useEffect, useState } from "react";
import { knowledgeStore } from "@/store/knowledge";
import type { ThreatActor } from "@/types/api";

const RISK_STYLE: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  CRITICAL: { bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/30",    glow: "shadow-red-500/10" },
  HIGH:     { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", glow: "shadow-orange-500/10" },
  MEDIUM:   { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", glow: "shadow-yellow-500/10" },
  LOW:      { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/30",   glow: "" },
  UNKNOWN:  { bg: "bg-surface-2",     text: "text-muted",      border: "border-border",         glow: "" },
};

interface Props { projectId: string }

export default function ThreatsClient({ projectId }: Props) {
  const state = knowledgeStore.useStore();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<ThreatActor | null>(null);

  useEffect(() => { knowledgeStore.loadThreats(projectId); }, [projectId]);

  const actors = state.threatActors;
  const loading = state.loading.threats;
  const error = state.error.threats;

  const filtered = actors.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      a.name.toLowerCase().includes(q) ||
      (a.description ?? "").toLowerCase().includes(q) ||
      (a.country ?? "").toLowerCase().includes(q) ||
      (a.aliases ?? []).some((al) => al.toLowerCase().includes(q));
    const matchRisk = riskFilter === "ALL" || a.riskLevel === riskFilter;
    return matchSearch && matchRisk;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-7 w-40 bg-surface-2 rounded animate-pulse mb-1" />
        <div className="h-4 w-32 bg-surface-2 rounded animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-surface-2 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }
  if (error) return <div className="p-6 text-center"><p className="text-danger text-sm mb-2">{error}</p><button onClick={() => knowledgeStore.loadThreats(projectId)} className="text-xs text-accent hover:underline">Retry</button></div>;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">Threat Actors</h1>
          <p className="text-muted text-xs mt-0.5">{actors.length} actor{actors.length !== 1 ? "s" : ""} identified</p>
        </div>
      </div>

      {actors.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-muted">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm.061 3.073a4 4 0 1 0-5.123 0 6.004 6.004 0 0 0-3.431 5.142.75.75 0 0 0 1.498.07 4.5 4.5 0 0 1 8.99 0 .75.75 0 1 0 1.498-.07 6.005 6.005 0 0 0-3.432-5.142Z"/></svg>
          </div>
          <p className="text-foreground font-medium mb-1">No Threat Actors Identified</p>
          <p className="text-muted text-sm max-w-xs">Run traffic analysis to detect associated threat actor attributions.</p>
        </div>
      ) : (
        <div className="flex gap-5">
          <div className="flex-1 min-w-0">
            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor name, aliases..." className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors" />
              </div>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-colors">
                <option value="ALL">All Risk Levels</option>
                {["CRITICAL","HIGH","MEDIUM","LOW","UNKNOWN"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Cards */}
            {filtered.length === 0 ? (
              <p className="text-muted text-sm text-center py-10">No matching actors</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((actor) => {
                  const rs = RISK_STYLE[actor.riskLevel ?? "UNKNOWN"];
                  const isSelected = selected?.id === actor.id;
                  return (
                    <div key={actor.id} onClick={() => setSelected(isSelected ? null : actor)} className={`cursor-pointer rounded-xl border p-4 transition-all ${isSelected ? "border-accent bg-accent/5" : `border-border bg-surface hover:border-accent/40 hover:bg-surface-2`}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${rs.bg} ${rs.border}`}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className={rs.text}><path d="M10.5 5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm.061 3.073a4 4 0 1 0-5.123 0 6.004 6.004 0 0 0-3.431 5.142.75.75 0 0 0 1.498.07 4.5 4.5 0 0 1 8.99 0 .75.75 0 1 0 1.498-.07 6.005 6.005 0 0 0-3.432-5.142Z"/></svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{actor.name}</p>
                            {actor.country && <p className="text-xs text-muted">{actor.country}</p>}
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${rs.bg} ${rs.text} ${rs.border}`}>
                          {actor.riskLevel ?? "UNKNOWN"}
                        </span>
                      </div>

                      {actor.description && <p className="text-xs text-muted line-clamp-2 mb-3">{actor.description}</p>}

                      <div className="flex flex-wrap gap-3 text-xs text-muted">
                        {(actor.techniques ?? []).length > 0 && <span><span className="text-foreground font-medium">{actor.techniques!.length}</span> techniques</span>}
                        {(actor.campaigns ?? []).length > 0 && <span><span className="text-foreground font-medium">{actor.campaigns!.length}</span> campaigns</span>}
                        {(actor.iocs ?? []).length > 0 && <span><span className="text-foreground font-medium">{actor.iocs!.length}</span> IOCs</span>}
                        {(actor.cves ?? []).length > 0 && <span><span className="text-foreground font-medium">{actor.cves!.length}</span> CVEs</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-80 shrink-0 bg-surface border border-border rounded-xl p-5 h-fit sticky top-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">{selected.name}</h2>
                  {selected.country && <p className="text-xs text-muted">{selected.country}</p>}
                </div>
                <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground transition-colors shrink-0">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
                </button>
              </div>
              {selected.description && <p className="text-xs text-foreground leading-relaxed">{selected.description}</p>}
              {(selected.aliases ?? []).length > 0 && (
                <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Aliases</p>
                  <div className="flex flex-wrap gap-1">{(selected.aliases ?? []).map((a) => <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted">{a}</span>)}</div>
                </div>
              )}
              {selected.motivation && <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Motivation</p><p className="text-xs text-foreground">{selected.motivation}</p></div>}
              {selected.sophistication && <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Sophistication</p><p className="text-xs text-foreground capitalize">{selected.sophistication}</p></div>}
              {(selected.campaigns ?? []).length > 0 && (
                <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Campaigns</p>
                  <div className="flex flex-wrap gap-1">{(selected.campaigns ?? []).map((c) => <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">{c}</span>)}</div>
                </div>
              )}
              {(selected.techniques ?? []).length > 0 && (
                <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">MITRE Techniques</p>
                  <div className="flex flex-wrap gap-1">{(selected.techniques ?? []).map((t) => <span key={t} className="text-xs font-mono px-2 py-0.5 rounded bg-surface-2 border border-border text-accent">{t}</span>)}</div>
                </div>
              )}
              {(selected.cves ?? []).length > 0 && (
                <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">CVEs</p>
                  <div className="flex flex-wrap gap-1">{(selected.cves ?? []).map((c) => <span key={c} className="text-xs font-mono px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400">{c}</span>)}</div>
                </div>
              )}
              {(selected.iocs ?? []).length > 0 && (
                <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">IOCs ({selected.iocs!.length})</p>
                  <div className="flex flex-wrap gap-1">{(selected.iocs ?? []).slice(0,5).map((ioc) => <span key={ioc} className="text-xs font-mono px-2 py-0.5 rounded bg-surface-2 border border-border text-muted truncate max-w-[120px]" title={ioc}>{ioc}</span>)}</div>
                  {selected.iocs!.length > 5 && <p className="text-xs text-muted mt-1">+{selected.iocs!.length - 5} more</p>}
                </div>
              )}
              {(selected.labels ?? []).length > 0 && (
                <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Labels</p>
                  <div className="flex flex-wrap gap-1">{(selected.labels ?? []).map((l) => <span key={l} className="text-xs px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted">{l}</span>)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
