"use client";

import { useEffect, useState } from "react";
import { knowledgeStore } from "@/store/knowledge";
import type { MitreTechnique } from "@/types/api";

const TACTIC_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "initial-access":       { bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/20" },
  "execution":            { bg: "bg-red-500/10",      text: "text-red-400",     border: "border-red-500/20" },
  "persistence":          { bg: "bg-orange-500/10",   text: "text-orange-400",  border: "border-orange-500/20" },
  "privilege-escalation": { bg: "bg-yellow-500/10",   text: "text-yellow-400",  border: "border-yellow-500/20" },
  "defense-evasion":      { bg: "bg-green-500/10",    text: "text-green-400",   border: "border-green-500/20" },
  "credential-access":    { bg: "bg-blue-500/10",     text: "text-blue-400",    border: "border-blue-500/20" },
  "discovery":            { bg: "bg-cyan-500/10",     text: "text-cyan-400",    border: "border-cyan-500/20" },
  "lateral-movement":     { bg: "bg-indigo-500/10",   text: "text-indigo-400",  border: "border-indigo-500/20" },
  "collection":           { bg: "bg-pink-500/10",     text: "text-pink-400",    border: "border-pink-500/20" },
  "exfiltration":         { bg: "bg-rose-500/10",     text: "text-rose-400",    border: "border-rose-500/20" },
  "command-and-control":  { bg: "bg-amber-500/10",    text: "text-amber-400",   border: "border-amber-500/20" },
  "impact":               { bg: "bg-red-600/10",      text: "text-red-400",     border: "border-red-600/20" },
};

function tacticColor(tactic: string) {
  const key = tactic.toLowerCase().replace(/\s+/g, "-");
  return TACTIC_COLORS[key] ?? { bg: "bg-surface-2", text: "text-muted", border: "border-border" };
}

const SEV: Record<string, { dot: string; text: string }> = {
  CRITICAL: { dot: "bg-red-400",    text: "text-red-400" },
  HIGH:     { dot: "bg-orange-400", text: "text-orange-400" },
  MEDIUM:   { dot: "bg-yellow-400", text: "text-yellow-400" },
  LOW:      { dot: "bg-blue-400",   text: "text-blue-400" },
  INFO:     { dot: "bg-muted",      text: "text-muted" },
};

interface Props {
  projectId: string;
}

export default function MitreClient({ projectId }: Props) {
  const state = knowledgeStore.useStore();
  const [search, setSearch] = useState("");
  const [tacticFilter, setTacticFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<MitreTechnique | null>(null);

  useEffect(() => {
    knowledgeStore.loadMitre(projectId);
  }, [projectId]);

  const techniques = state.mitreTechniques;
  const loading = state.loading.mitre;
  const error = state.error.mitre;

  const tactics = Array.from(new Set(techniques.map((t) => t.tactic).filter(Boolean)));

  const filtered = techniques.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      t.id.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      (t.tactic ?? "").toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q);
    const matchTactic = tacticFilter === "ALL" || t.tactic === tacticFilter;
    return matchSearch && matchTactic;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-5">
          <div className="h-7 w-40 bg-surface-2 rounded animate-pulse mb-1" />
          <div className="h-4 w-56 bg-surface-2 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 w-20 bg-surface-2 rounded mb-2" />
              <div className="h-5 w-48 bg-surface-2 rounded mb-3" />
              <div className="h-3 w-32 bg-surface-2 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh]">
        <div className="text-danger text-sm mb-3">{error}</div>
        <button onClick={() => knowledgeStore.loadMitre(projectId)} className="text-xs text-accent hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">MITRE ATT&CK</h1>
          <p className="text-muted text-xs mt-0.5">{techniques.length} technique{techniques.length !== 1 ? "s" : ""} detected</p>
        </div>
        {techniques.length > 0 && (
          <a
            href="https://attack.mitre.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline flex items-center gap-1"
          >
            MITRE ATT&CK Matrix
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
            </svg>
          </a>
        )}
      </div>

      {techniques.length === 0 ? (
        <EmptyState icon="mitre" title="No MITRE Techniques" description="Start a capture or scan to detect ATT&CK techniques automatically." />
      ) : (
        <div className="flex gap-5">
          {/* Left: list */}
          <div className="flex-1 min-w-0">
            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                  <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search techniques..."
                  className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                />
              </div>
              <select
                value={tacticFilter}
                onChange={(e) => setTacticFilter(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
              >
                <option value="ALL">All Tactics</option>
                {tactics.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Tactic pills */}
            {tactics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                <button
                  onClick={() => setTacticFilter("ALL")}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${tacticFilter === "ALL" ? "bg-accent text-background border-accent" : "border-border text-muted hover:text-foreground"}`}
                >
                  All
                </button>
                {tactics.map((t) => {
                  const c = tacticColor(t);
                  return (
                    <button
                      key={t}
                      onClick={() => setTacticFilter(tacticFilter === t ? "ALL" : t)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${tacticFilter === t ? `${c.bg} ${c.text} ${c.border}` : "border-border text-muted hover:text-foreground"}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Grid */}
            {filtered.length === 0 ? (
              <p className="text-muted text-sm text-center py-10">No results matching "{search}"</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map((t) => {
                  const tc = tacticColor(t.tactic ?? "");
                  const sv = SEV[t.severity ?? ""] ?? SEV.INFO;
                  const isSelected = selected?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelected(isSelected ? null : t)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${isSelected ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-accent/40 hover:bg-surface-2"}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-mono text-accent font-semibold">{t.id}</span>
                        {t.severity && (
                          <span className={`flex items-center gap-1 text-xs font-medium ${sv.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sv.dot}`} />
                            {t.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground mb-2">{t.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {t.tactic && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tc.bg} ${tc.text} ${tc.border}`}>
                            {t.tactic}
                          </span>
                        )}
                        {(t.platforms ?? []).slice(0, 2).map((p) => (
                          <span key={p} className="text-xs px-2 py-0.5 rounded-full border border-border bg-surface-2 text-muted">{p}</span>
                        ))}
                        {(t.platforms ?? []).length > 2 && (
                          <span className="text-xs text-muted">+{(t.platforms ?? []).length - 2}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: detail panel */}
          {selected && (
            <div className="w-80 shrink-0 bg-surface border border-border rounded-xl p-5 h-fit sticky top-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono text-accent font-semibold block">{selected.id}</span>
                  <h2 className="text-sm font-bold text-foreground mt-1">{selected.name}</h2>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground transition-colors shrink-0">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              </div>

              {selected.tactic && (
                <DetailRow label="Tactic">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tacticColor(selected.tactic).bg} ${tacticColor(selected.tactic).text} ${tacticColor(selected.tactic).border}`}>
                    {selected.tactic}
                  </span>
                </DetailRow>
              )}

              {(selected.platforms ?? []).length > 0 && (
                <DetailRow label="Platforms">
                  <div className="flex flex-wrap gap-1">
                    {(selected.platforms ?? []).map((p) => (
                      <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted">{p}</span>
                    ))}
                  </div>
                </DetailRow>
              )}

              {selected.description && (
                <DetailRow label="Description">
                  <p className="text-xs text-foreground leading-relaxed">{selected.description}</p>
                </DetailRow>
              )}

              {selected.evidence && (
                <DetailRow label="Evidence from Capture">
                  <p className="text-xs text-foreground font-mono bg-surface-2 rounded-lg p-2 leading-relaxed">{selected.evidence}</p>
                </DetailRow>
              )}

              {selected.detection && (
                <DetailRow label="Detection">
                  <p className="text-xs text-foreground leading-relaxed">{selected.detection}</p>
                </DetailRow>
              )}

              {(selected.mitigations ?? []).length > 0 && (
                <DetailRow label="Mitigations">
                  <ul className="space-y-1">
                    {(selected.mitigations ?? []).map((m, i) => (
                      <li key={i} className="text-xs text-foreground flex gap-1.5"><span className="text-accent mt-0.5">›</span>{m}</li>
                    ))}
                  </ul>
                </DetailRow>
              )}

              {(selected.relatedTechniques ?? []).length > 0 && (
                <DetailRow label="Related Techniques">
                  <div className="flex flex-wrap gap-1">
                    {(selected.relatedTechniques ?? []).map((rt) => (
                      <span key={rt} className="text-xs font-mono px-2 py-0.5 rounded bg-surface-2 border border-border text-accent">{rt}</span>
                    ))}
                  </div>
                </DetailRow>
              )}

              {selected.url && (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline mt-1"
                >
                  View on MITRE ATT&CK
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">{label}</p>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-muted">
        <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z" />
        </svg>
      </div>
      <p className="text-foreground font-medium mb-1">{title}</p>
      <p className="text-muted text-sm max-w-xs">{description}</p>
    </div>
  );
}
