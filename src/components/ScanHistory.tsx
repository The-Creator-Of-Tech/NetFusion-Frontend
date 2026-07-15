"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Port {
  port: number;
  state: string;
  service: string;
}

interface ScanResults {
  target: string;
  profile?: string;
  ports: Port[];
}

export interface ScanRow {
  id: string;
  target: string;
  results: ScanResults;
  createdAt: string;
}

interface Props {
  projectId: string;
  initialScans: ScanRow[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
    hour:  "numeric",
    minute: "2-digit",
  });
}

function openPortCount(results: ScanResults): number {
  return (results?.ports ?? []).filter((p) => p.state === "open").length;
}

// ── Detail modal ───────────────────────────────────────────────────────────────

function ScanDetailModal({ scan, onClose }: { scan: ScanRow; onClose: () => void }) {
  const ports    = scan.results?.ports ?? [];
  const open     = ports.filter((p) => p.state === "open");
  const other    = ports.filter((p) => p.state !== "open");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-xs text-muted mb-0.5">Scan result</p>
            <h2 className="text-sm font-semibold text-foreground font-mono">{scan.target}</h2>
            <p className="text-xs text-muted mt-0.5">{formatDate(scan.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors p-1 rounded ml-4 shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-surface-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-foreground font-medium">{open.length} open</span>
          </div>
          {other.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-border" />
              <span className="text-xs text-muted">{other.length} closed / filtered</span>
            </div>
          )}
          {scan.results?.profile && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted capitalize">{scan.results.profile} scan</span>
            </div>
          )}
          <span className="text-xs text-muted ml-auto">{ports.length} port{ports.length !== 1 ? "s" : ""} scanned</span>
        </div>

        {/* Port table */}
        <div className="flex-1 overflow-y-auto">
          {ports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <p className="text-muted text-sm">No port data recorded for this scan.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-2 border-b border-border">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted">Port</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted">State</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted">Service</th>
                </tr>
              </thead>
              <tbody>
                {/* Open ports first */}
                {[...open, ...other].map((p) => (
                  <tr
                    key={p.port}
                    className="border-b border-border last:border-0 hover:bg-surface-2/60 transition-colors"
                  >
                    <td className="px-5 py-2.5 font-mono text-foreground text-xs font-medium">
                      {p.port}
                    </td>
                    <td className="px-5 py-2.5">
                      {p.state === "open" ? (
                        <span className="text-xs font-semibold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded">
                          open
                        </span>
                      ) : (
                        <span className="text-xs text-muted bg-surface-2 border border-border px-2 py-0.5 rounded">
                          {p.state}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-muted text-xs">
                      {p.service || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ScanHistory({ projectId, initialScans }: Props) {
  const [scans,  setScans]  = useState<ScanRow[]>(initialScans);
  const [detail, setDetail] = useState<ScanRow | null>(null);
  const router = useRouter();

  // Called by ScanPanel after a successful save so list updates instantly
  function addScan(scan: ScanRow) {
    setScans((prev) => [scan, ...prev]);
  }

  function reopenScan(scan: ScanRow) {
    const profile = scan.results?.profile ?? "quick";
    router.push(`?target=${encodeURIComponent(scan.target)}&profile=${encodeURIComponent(profile)}`);
  }

  void projectId;

  return (
    <>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-2">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-muted">
              <path d="M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25v-8.5C0 2.784.784 2 1.75 2ZM1.5 12.251c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V5.5h-13v6.751Zm13-8.751H1.5v-.75a.25.25 0 0 1 .25-.25h12.5a.25.25 0 0 1 .25.25v.75Z" />
            </svg>
            <h3 className="text-sm font-semibold text-foreground">Scan History</h3>
          </div>
          <span className="text-xs text-muted">
            {scans.length} scan{scans.length !== 1 ? "s" : ""}
          </span>
        </div>

        {scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-3 text-muted">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z" />
              </svg>
            </div>
            <p className="text-foreground text-sm font-medium mb-1">No scans yet</p>
            <p className="text-muted text-xs">Run your first scan above to see results here.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted">Target</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted hidden sm:table-cell">Profile</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted hidden sm:table-cell">Open Ports</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted hidden md:table-cell">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted hidden md:table-cell">Status</th>
                <th className="px-5 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {scans.map((scan, i) => {
                const open = openPortCount(scan.results);
                const profile = scan.results?.profile ?? "quick";
                return (
                  <tr
                    key={scan.id}
                    className={`border-b border-border last:border-0 hover:bg-surface-2/60 transition-colors ${
                      i % 2 === 1 ? "bg-surface/40" : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      <span className="font-mono text-foreground text-xs font-medium">
                        {scan.target}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="text-xs text-muted capitalize">{profile}</span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      {open > 0 ? (
                        <span className="text-xs font-semibold text-success">
                          {open} open
                        </span>
                      ) : (
                        <span className="text-xs text-muted">None</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted text-xs hidden md:table-cell whitespace-nowrap">
                      {formatDate(scan.createdAt)}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className="text-xs font-semibold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded">
                        Completed
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => reopenScan(scan)}
                          className="text-xs text-muted hover:text-foreground font-medium transition-colors flex items-center gap-1"
                          title="Reopen in scan panel"
                        >
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
                          </svg>
                          Reopen
                        </button>
                        <button
                          onClick={() => setDetail(scan)}
                          className="text-xs text-accent hover:text-accent-hover font-medium transition-colors flex items-center gap-1"
                        >
                          View
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <ScanDetailModal
          scan={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}

// Export addScan type for parent wiring
export type { Props as ScanHistoryProps };
