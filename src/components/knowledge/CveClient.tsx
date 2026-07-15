"use client";

import { useEffect, useState } from "react";
import { knowledgeStore } from "@/store/knowledge";
import type { CveRecord } from "@/types/api";
import { usePagination } from "@/hooks/usePagination";

const SEV: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  CRITICAL: { bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/30",    dot: "bg-red-400" },
  HIGH:     { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-400" },
  MEDIUM:   { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30", dot: "bg-yellow-400" },
  LOW:      { bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/30",   dot: "bg-blue-400" },
  INFO:     { bg: "bg-surface-2",     text: "text-muted",      border: "border-border",         dot: "bg-muted" },
};

const PATCH_BADGE: Record<string, { bg: string; text: string }> = {
  patched:    { bg: "bg-green-500/10", text: "text-green-400" },
  unpatched:  { bg: "bg-red-500/10",  text: "text-red-400" },
  workaround: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  unknown:    { bg: "bg-surface-2",   text: "text-muted" },
};

function cvssBar(score?: number) {
  if (!score) return null;
  const pct = (score / 10) * 100;
  const color = score >= 9 ? "bg-red-500" : score >= 7 ? "bg-orange-500" : score >= 4 ? "bg-yellow-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-surface-2 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-semibold text-foreground">{score.toFixed(1)}</span>
    </div>
  );
}

interface Props {
  projectId: string;
}

export default function CveClient({ projectId }: Props) {
  const state = knowledgeStore.useStore();
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<CveRecord | null>(null);

  useEffect(() => {
    knowledgeStore.loadCve(projectId);
  }, [projectId]);

  const records = state.cveRecords;
  const loading = state.loading.cve;
  const error = state.error.cve;

  const filtered = records.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      c.id.toLowerCase().includes(q) ||
      (c.description ?? "").toLowerCase().includes(q) ||
      (c.vendor ?? "").toLowerCase().includes(q) ||
      (c.product ?? "").toLowerCase().includes(q);
    const matchSev = sevFilter === "ALL" || c.severity === sevFilter;
    return matchSearch && matchSev;
  });

  const pagination = usePagination({ initialLimit: 15, initialTotal: filtered.length });
  const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[40vh]">
        <p className="text-danger text-sm mb-3">{error}</p>
        <button onClick={() => knowledgeStore.loadCve(projectId)} className="text-xs text-accent hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">CVE Explorer</h1>
          <p className="text-muted text-xs mt-0.5">{records.length} CVE{records.length !== 1 ? "s" : ""} identified</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-muted">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1ZM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .75.75h2.5a.75.75 0 0 0 0-1.5H8.75v-2.75Zm0 6.5a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-1">No CVEs Detected</p>
          <p className="text-muted text-sm max-w-xs">Run a capture or scan to identify CVEs in your environment.</p>
        </div>
      ) : (
        <div className="flex gap-5">
          <div className="flex-1 min-w-0">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                  <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
                </svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search CVE ID, vendor, product..." className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors" />
              </div>
              <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-colors">
                <option value="ALL">All Severities</option>
                {["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Table */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted">CVE ID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted">Severity</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden sm:table-cell">CVSS</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden md:table-cell">Vendor / Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden lg:table-cell">Patch</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((cve) => {
                    const sev = SEV[cve.severity ?? "INFO"] ?? SEV.INFO;
                    const patch = PATCH_BADGE[cve.patchStatus ?? "unknown"] ?? PATCH_BADGE.unknown;
                    const isSelected = selected?.id === cve.id;
                    return (
                      <tr key={cve.id} onClick={() => setSelected(isSelected ? null : cve)} className={`border-b border-border last:border-0 cursor-pointer transition-colors ${isSelected ? "bg-accent/5" : "hover:bg-surface-2/60"}`}>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-semibold text-accent">{cve.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg border ${sev.bg} ${sev.text} ${sev.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                            {cve.severity ?? "INFO"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell w-36">
                          {cve.cvssScore ? cvssBar(cve.cvssScore) : <span className="text-muted text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-muted">
                          {cve.vendor ?? "—"}{cve.product ? ` / ${cve.product}` : ""}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${patch.bg} ${patch.text}`}>
                            {cve.patchStatus ?? "unknown"}
                          </span>
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
                    <button onClick={pagination.prevPage} disabled={!pagination.hasPrevPage} className="px-2.5 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover disabled:opacity-50 transition-all">Previous</button>
                    <span className="font-mono px-2 self-center">Page {pagination.page} of {pagination.totalPages}</span>
                    <button onClick={pagination.nextPage} disabled={!pagination.hasNextPage} className="px-2.5 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover disabled:opacity-50 transition-all">Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-80 shrink-0 bg-surface border border-border rounded-xl p-5 h-fit sticky top-4 space-y-4">
              <div className="flex items-start justify-between">
                <span className="text-sm font-mono font-bold text-accent">{selected.id}</span>
                <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground transition-colors">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
                </button>
              </div>
              {selected.description && <p className="text-xs text-foreground leading-relaxed">{selected.description}</p>}
              {selected.cvssScore !== undefined && selected.cvssScore !== null && (
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1.5">CVSS Score</p>
                  {cvssBar(selected.cvssScore)}
                  {selected.cvssVector && <p className="text-xs font-mono text-muted mt-1 break-all">{selected.cvssVector}</p>}
                </div>
              )}
              {(selected.exploitabilityScore || selected.impactScore) && (
                <div className="grid grid-cols-2 gap-2">
                  {selected.exploitabilityScore && (
                    <div className="bg-surface-2 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-muted mb-0.5">Exploitability</p>
                      <p className="text-sm font-bold text-foreground">{selected.exploitabilityScore}</p>
                    </div>
                  )}
                  {selected.impactScore && (
                    <div className="bg-surface-2 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-muted mb-0.5">Impact</p>
                      <p className="text-sm font-bold text-foreground">{selected.impactScore}</p>
                    </div>
                  )}
                </div>
              )}
              {(selected.vendor || selected.product) && (
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Affected</p>
                  <p className="text-xs text-foreground">{[selected.vendor, selected.product].filter(Boolean).join(" › ")}</p>
                </div>
              )}
              {selected.patchStatus && (
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Patch Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(PATCH_BADGE[selected.patchStatus] ?? PATCH_BADGE.unknown).bg} ${(PATCH_BADGE[selected.patchStatus] ?? PATCH_BADGE.unknown).text}`}>
                    {selected.patchStatus}
                  </span>
                </div>
              )}
              {(selected.cweIds ?? []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">CWE IDs</p>
                  <div className="flex flex-wrap gap-1">
                    {(selected.cweIds ?? []).map((cwe) => (
                      <span key={cwe} className="text-xs font-mono px-2 py-0.5 rounded bg-surface-2 border border-border text-muted">{cwe}</span>
                    ))}
                  </div>
                </div>
              )}
              {(selected.relatedFindings ?? []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Related Findings</p>
                  <p className="text-xs text-foreground">{selected.relatedFindings!.length} finding{selected.relatedFindings!.length !== 1 ? "s" : ""}</p>
                </div>
              )}
              {(selected.references ?? []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">References</p>
                  <div className="space-y-1">
                    {(selected.references ?? []).slice(0, 3).map((ref, i) => (
                      <a key={i} href={ref} target="_blank" rel="noopener noreferrer" className="block text-xs text-accent hover:underline truncate">{ref}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6">
      <div className="h-7 w-40 bg-surface-2 rounded animate-pulse mb-1" />
      <div className="h-4 w-32 bg-surface-2 rounded animate-pulse mb-5" />
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-border last:border-0 animate-pulse">
            <div className="h-4 w-32 bg-surface-2 rounded" />
            <div className="h-4 w-20 bg-surface-2 rounded" />
            <div className="h-4 w-16 bg-surface-2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
