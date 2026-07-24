"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { knowledgeStore } from "@/store/knowledge";
import type { KnowledgeSearchResult } from "@/types/api";

const TYPE_CONFIG: Record<KnowledgeSearchResult["type"], { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  mitre:    { label: "MITRE",    bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"/></svg> },
  cve:      { label: "CVE",      bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1ZM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .75.75h2.5a.75.75 0 0 0 0-1.5H8.75v-2.75Z"/></svg> },
  ioc:      { label: "IOC",      bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/></svg> },
  threat:   { label: "Threat",   bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/20",    icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M10.5 5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"/></svg> },
  campaign: { label: "Campaign", bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/20",  icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Z"/></svg> },
};

const SEV_DOT: Record<string, string> = {
  CRITICAL: "bg-red-400",
  HIGH:     "bg-orange-400",
  MEDIUM:   "bg-yellow-400",
  LOW:      "bg-blue-400",
  INFO:     "bg-muted",
};

const FILTERS = ["ALL", "mitre", "cve", "ioc", "threat", "campaign"] as const;

interface Props { projectId: string }

export default function KnowledgeSearchClient({ projectId }: Props) {
  const state = knowledgeStore.useStore();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback((q: string) => {
    knowledgeStore.search(projectId, q);
  }, [projectId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  const results = state.searchResults;
  const loading = state.loading.search;
  const error = state.error.search;

  const filtered = results.filter((r) => {
    const matchType = typeFilter === "ALL" || r.type === typeFilter;
    const matchSev = severityFilter === "ALL" || r.severity === severityFilter;
    return matchType && matchSev;
  });

  const typeCounts = results.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-foreground mb-1">Knowledge Search</h1>
        <p className="text-muted text-xs">Search across MITRE techniques, CVEs, IOCs, threat actors, and campaigns</p>
      </div>

      {/* Search input */}
      <div className="relative mb-5">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search techniques, CVEs, IOCs, actors, campaigns..."
          className="w-full bg-surface border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {query && !loading && (
          <button onClick={() => { setQuery(""); knowledgeStore.setSearchResults([]); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg>
          </button>
        )}
      </div>

      {/* Filters */}
      {results.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {FILTERS.map((f) => {
            const count = f === "ALL" ? results.length : (typeCounts[f] ?? 0);
            const cfg = f !== "ALL" ? TYPE_CONFIG[f as KnowledgeSearchResult["type"]] : null;
            return (
              <button
                key={f}
                onClick={() => setTypeFilter(typeFilter === f ? "ALL" : f)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  typeFilter === f
                    ? cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "bg-accent text-background border-accent"
                    : "border-border text-muted hover:text-foreground hover:border-accent/40"
                }`}
              >
                {cfg && cfg.icon}
                {f === "ALL" ? "All" : cfg?.label ?? f} ({count})
              </button>
            );
          })}
          <div className="ml-auto">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            >
              <option value="ALL">All Severities</option>
              {["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Results / State */}
      {!query ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-muted">
            <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-1">Search Your Intelligence</p>
          <p className="text-muted text-sm max-w-sm">Type a technique ID, CVE, IP address, domain, actor name, or campaign to search across all knowledge.</p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {["T1046", "CVE-2024", "malicious", "APT"].map((hint) => (
              <button key={hint} onClick={() => setQuery(hint)} className="text-xs px-3 py-1.5 rounded-full border border-border text-muted hover:text-foreground hover:border-accent/40 transition-colors">
                {hint}
              </button>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-10"><p className="text-danger text-sm">{error}</p></div>
      ) : filtered.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-3 text-muted">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/></svg>
          </div>
          <p className="text-foreground font-medium mb-1">No results for &quot;{query}&quot;</p>
          <p className="text-muted text-sm">Try different keywords or run a capture session first</p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-muted mb-3">{filtered.length} result{filtered.length !== 1 ? "s" : ""}{query ? ` for "${query}"` : ""}</p>
          <div className="space-y-2">
            {filtered.map((result) => {
              const cfg = TYPE_CONFIG[result.type as keyof typeof TYPE_CONFIG] ?? {
                label: result.type.toUpperCase(),
                bg: "bg-blue-500/10",
                text: "text-blue-400",
                border: "border-blue-500/20",
                icon: null,
              };
              const sevDot = SEV_DOT[result.severity ?? ""] ?? "";
              return (
                <div key={`${result.type}-${result.id}`} className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl hover:border-accent/40 hover:bg-surface-2 transition-all cursor-pointer group">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{result.title}</p>
                    {result.subtitle && <p className="text-xs text-muted truncate">{result.subtitle}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {result.severity && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <span className={`w-1.5 h-1.5 rounded-full ${sevDot}`} />
                        {result.severity}
                      </span>
                    )}
                    {(result.tags ?? []).slice(0, 2).map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted hidden sm:inline">{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
