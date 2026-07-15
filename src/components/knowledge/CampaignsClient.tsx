"use client";

import { useEffect, useState } from "react";
import { knowledgeStore } from "@/store/knowledge";
import type { Campaign } from "@/types/api";

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  active:    { bg: "bg-green-500/10",  text: "text-green-400",  dot: "bg-green-400" },
  concluded: { bg: "bg-surface-2",     text: "text-muted",      dot: "bg-muted" },
  unknown:   { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
};

const SEV_DOT: Record<string, string> = {
  CRITICAL: "bg-red-400",
  HIGH:     "bg-orange-400",
  MEDIUM:   "bg-yellow-400",
  LOW:      "bg-blue-400",
  INFO:     "bg-muted",
};

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props { projectId: string }

export default function CampaignsClient({ projectId }: Props) {
  const state = knowledgeStore.useStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Campaign | null>(null);

  useEffect(() => { knowledgeStore.loadCampaigns(projectId); }, [projectId]);

  const campaigns = state.campaigns;
  const loading = state.loading.campaigns;
  const error = state.error.campaigns;

  const filtered = campaigns.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !search || c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q) || (c.attribution ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({length:4}).map((_,i) => <div key={i} className="h-48 bg-surface-2 rounded-xl animate-pulse" />)}</div>;
  if (error) return <div className="p-6 text-center"><p className="text-danger text-sm mb-2">{error}</p><button onClick={() => knowledgeStore.loadCampaigns(projectId)} className="text-xs text-accent hover:underline">Retry</button></div>;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">Campaigns</h1>
          <p className="text-muted text-xs mt-0.5">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} tracked</p>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-muted">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L9 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"/></svg>
          </div>
          <p className="text-foreground font-medium mb-1">No Campaigns Detected</p>
          <p className="text-muted text-sm max-w-xs">Capture and analyze network traffic to identify threat campaigns.</p>
        </div>
      ) : (
        <div className="flex gap-5">
          <div className="flex-1 min-w-0">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns..." className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-colors">
                <option value="ALL">All Statuses</option>
                {["active","concluded","unknown"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Campaign cards */}
            {filtered.length === 0 ? (
              <p className="text-muted text-sm text-center py-10">No campaigns match your search</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((campaign) => {
                  const ss = STATUS_STYLE[campaign.status ?? "unknown"];
                  const sevDot = SEV_DOT[campaign.severity ?? ""] ?? "";
                  const isSelected = selected?.id === campaign.id;
                  return (
                    <div key={campaign.id} onClick={() => setSelected(isSelected ? null : campaign)} className={`cursor-pointer rounded-xl border p-4 transition-all ${isSelected ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-accent/40 hover:bg-surface-2"}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {campaign.severity && <span className={`w-2 h-2 rounded-full shrink-0 ${sevDot}`} />}
                          <h3 className="text-sm font-semibold text-foreground">{campaign.name}</h3>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${ss.bg} ${ss.text} shrink-0`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                          {campaign.status ?? "unknown"}
                        </span>
                      </div>
                      {campaign.description && <p className="text-xs text-muted line-clamp-2 mb-3">{campaign.description}</p>}
                      
                      {/* Timeline */}
                      {(campaign.startDate || campaign.endDate) && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex-1 bg-surface-2 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-accent/50 rounded-full w-full" />
                          </div>
                          <span className="text-xs text-muted whitespace-nowrap">
                            {formatDate(campaign.startDate)} — {formatDate(campaign.endDate)}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 text-xs text-muted">
                        {(campaign.associatedActors ?? []).length > 0 && <span><span className="text-foreground font-medium">{campaign.associatedActors!.length}</span> actors</span>}
                        {(campaign.associatedTechniques ?? []).length > 0 && <span><span className="text-foreground font-medium">{campaign.associatedTechniques!.length}</span> techniques</span>}
                        {(campaign.findings ?? []).length > 0 && <span><span className="text-foreground font-medium">{campaign.findings!.length}</span> findings</span>}
                        {(campaign.iocs ?? []).length > 0 && <span><span className="text-foreground font-medium">{campaign.iocs!.length}</span> IOCs</span>}
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
                  <span className={`inline-flex items-center gap-1 text-xs mt-1 ${STATUS_STYLE[selected.status ?? "unknown"].text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[selected.status ?? "unknown"].dot}`} />
                    {selected.status ?? "unknown"}
                  </span>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground transition-colors shrink-0">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
                </button>
              </div>
              {selected.description && <p className="text-xs text-foreground leading-relaxed">{selected.description}</p>}
              {selected.objectives && <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Objectives</p><p className="text-xs text-foreground">{selected.objectives}</p></div>}
              {selected.attribution && <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Attribution</p><p className="text-xs text-foreground">{selected.attribution}</p></div>}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-2 rounded-lg p-2"><p className="text-[10px] text-muted mb-0.5">Start</p><p className="text-xs font-medium text-foreground">{formatDate(selected.startDate)}</p></div>
                <div className="bg-surface-2 rounded-lg p-2"><p className="text-[10px] text-muted mb-0.5">End</p><p className="text-xs font-medium text-foreground">{formatDate(selected.endDate)}</p></div>
              </div>
              {(selected.associatedActors ?? []).length > 0 && (
                <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Associated Actors</p>
                  <div className="flex flex-wrap gap-1">{(selected.associatedActors ?? []).map((a) => <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">{a}</span>)}</div>
                </div>
              )}
              {(selected.associatedTechniques ?? []).length > 0 && (
                <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Techniques</p>
                  <div className="flex flex-wrap gap-1">{(selected.associatedTechniques ?? []).map((t) => <span key={t} className="text-xs font-mono px-2 py-0.5 rounded bg-surface-2 border border-border text-accent">{t}</span>)}</div>
                </div>
              )}
              {(selected.assets ?? []).length > 0 && (
                <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Affected Assets ({selected.assets!.length})</p></div>
              )}
              {(selected.findings ?? []).length > 0 && (
                <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Findings ({selected.findings!.length})</p></div>
              )}
              {(selected.reports ?? []).length > 0 && (
                <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Reports ({selected.reports!.length})</p></div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
