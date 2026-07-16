"use client";

import { useState, useRef, useEffect } from "react";
import { investigationStore } from "@/store/investigation";
import { usePagination } from "@/hooks/usePagination";
import type { TimelineEntry } from "@/types/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  initialEntries: TimelineEntry[];
  currentUser: { id: string; name: string };
}

// ── Filter categories ──────────────────────────────────────────────────────────

type FilterKey = "ALL" | "ASSETS" | "FINDINGS" | "WORKFLOW" | "NOTES" | "MANUAL" | "AI" | "NMAP";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL",      label: "All"        },
  { key: "ASSETS",   label: "Assets"     },
  { key: "FINDINGS", label: "Findings"   },
  { key: "WORKFLOW", label: "Workflow"   },
  { key: "NOTES",    label: "Notes"      },
  { key: "NMAP",     label: "Scans"      },
  { key: "AI",       label: "AI"         },
  { key: "MANUAL",   label: "Manual"     },
];

function getSource(entry: TimelineEntry): string {
  return (entry.source ?? "system").toLowerCase();
}

function matchesFilter(entry: TimelineEntry, filter: FilterKey): boolean {
  if (filter === "ALL") return true;
  const src = getSource(entry);
  if (filter === "ASSETS")   return src === "asset";
  if (filter === "FINDINGS") return src === "finding";
  if (filter === "NOTES")    return src === "note";
  if (filter === "MANUAL")   return src === "manual";
  if (filter === "WORKFLOW") return src === "workflow";
  if (filter === "AI")       return src === "ai" || src === "ioc";
  if (filter === "NMAP")     return src === "nmap";
  return true;
}

// ── Relative time ──────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs  = Math.floor(diff / 1000);
  const mins  = Math.floor(secs  / 60);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);
  if (secs  < 60)  return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return (
    <span
      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
      style={{ background: `hsl(${hue},55%,42%)` }}
      title={name}
    >
      {initials}
    </span>
  );
}

// ── Severity badge ─────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return null;
  const map: Record<string, string> = {
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
    HIGH:     "bg-orange-500/20 text-orange-400 border-orange-500/30",
    MEDIUM:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    LOW:      "bg-blue-500/20 text-blue-400 border-blue-500/30",
    INFO:     "bg-surface-2 text-muted border-border",
  };
  const cls = map[severity.toUpperCase()] ?? "bg-surface-2 text-muted border-border";
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>
      {severity}
    </span>
  );
}

// ── Entry icon ─────────────────────────────────────────────────────────────────

function EntryIcon({ entry }: { entry: TimelineEntry }) {
  const src = getSource(entry);

  if (src === "asset") {
    return (
      <span className="w-8 h-8 rounded-lg border border-accent/20 bg-accent/10 flex items-center justify-center shrink-0 text-accent">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25v-8.5C0 2.784.784 2 1.75 2ZM1.5 12.251c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V5.5h-13v6.751Zm13-8.751H1.5v-.75a.25.25 0 0 1 .25-.25h12.5a.25.25 0 0 1 .25.25v.75Z" />
        </svg>
      </span>
    );
  }
  if (src === "finding") {
    return (
      <span className="w-8 h-8 rounded-lg border border-orange-500/20 bg-orange-500/10 flex items-center justify-center shrink-0 text-orange-400">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.533.133a1.75 1.75 0 0 0-1.066 0l-5.25 1.68A1.75 1.75 0 0 0 1 3.48V7c0 1.566.32 3.182 1.303 4.682.983 1.498 2.585 2.813 5.032 3.855a1.697 1.697 0 0 0 1.33 0c2.447-1.042 4.049-2.357 5.032-3.855C14.68 10.182 15 8.566 15 7V3.48a1.75 1.75 0 0 0-1.217-1.667ZM8.75 4.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 1.5 0ZM8 10.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z" />
        </svg>
      </span>
    );
  }
  if (src === "note") {
    return (
      <span className="w-8 h-8 rounded-lg border border-purple-500/20 bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-400">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 3.75A.75.75 0 0 1 .75 3h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 3.75Zm0 4A.75.75 0 0 1 .75 7h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 7.75Zm0 4a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Z" />
        </svg>
      </span>
    );
  }
  if (src === "workflow") {
    return (
      <span className="w-8 h-8 rounded-lg border border-green-500/20 bg-green-500/10 flex items-center justify-center shrink-0 text-green-400">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0ZM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM6.379 5.227A.25.25 0 0 0 6 5.442v5.117a.25.25 0 0 0 .379.214l4.264-2.559a.25.25 0 0 0 0-.428L6.379 5.227Z" />
        </svg>
      </span>
    );
  }
  if (src === "nmap") {
    return (
      <span className="w-8 h-8 rounded-lg border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center shrink-0 text-cyan-400">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5Z" />
        </svg>
      </span>
    );
  }
  if (src === "ai" || src === "ioc") {
    return (
      <span className="w-8 h-8 rounded-lg border border-violet-500/20 bg-violet-500/10 flex items-center justify-center shrink-0 text-violet-400">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25ZM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
        </svg>
      </span>
    );
  }
  if (src === "manual") {
    return (
      <span className="w-8 h-8 rounded-lg border border-accent/20 bg-accent/10 flex items-center justify-center shrink-0 text-accent">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z" />
        </svg>
      </span>
    );
  }
  // member / system / default
  return (
    <span className="w-8 h-8 rounded-lg border border-border bg-surface-2 flex items-center justify-center shrink-0 text-muted">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
      </svg>
    </span>
  );
}

// ── Add Observation Modal ──────────────────────────────────────────────────────

interface ObservationModalProps {
  projectId: string;
  onAdded: (entry: TimelineEntry) => void;
  onClose: () => void;
}

function ObservationModal({ projectId, onAdded, onClose }: ObservationModalProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) { setError("Observation text is required"); return; }
    setError(""); setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Failed to save"); return; }
    onAdded(data.entry);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Add Observation</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground p-1 rounded">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <textarea autoFocus rows={4} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Describe what you observed..."
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors resize-none" />
          {error && <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose}
              className="border border-border text-muted px-4 py-2 rounded-lg text-sm hover:bg-surface-2 transition-colors">Cancel</button>
            <button type="submit" disabled={loading || !text.trim()}
              className="bg-accent text-background px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors">
              {loading ? "Adding..." : "Add to Timeline"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TimelineClient({ projectId, initialEntries, currentUser }: Props) {
  const [storeState, setStoreState] = useState(investigationStore.getState());
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (investigationStore.getState().timeline.length === 0) {
      investigationStore.setState({ timeline: initialEntries });
    }
    const unsubscribe = investigationStore.subscribe((state) => setStoreState(state));
    investigationStore.loadTimeline(projectId);
    return () => unsubscribe();
  }, [projectId, initialEntries]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  function handleAdded(entry: TimelineEntry) {
    investigationStore.addTimelineEntry(entry);
    setModalOpen(false);
    showToast("Observation added");
  }

  const entries = storeState.timeline as TimelineEntry[];

  const filtered = entries.filter((e) => {
    const matchF = matchesFilter(e, filter);
    const matchS = !search ||
      (e.description ?? e.action ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.user?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.title ?? "").toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  const pagination = usePagination({ initialLimit: 15, initialTotal: filtered.length });
  useEffect(() => { pagination.setTotal(filtered.length); }, [filtered.length]);
  const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

  const counts: Record<FilterKey, number> = {
    ALL:      entries.length,
    ASSETS:   entries.filter((e) => getSource(e) === "asset").length,
    FINDINGS: entries.filter((e) => getSource(e) === "finding").length,
    WORKFLOW: entries.filter((e) => getSource(e) === "workflow").length,
    NOTES:    entries.filter((e) => getSource(e) === "note").length,
    NMAP:     entries.filter((e) => getSource(e) === "nmap").length,
    AI:       entries.filter((e) => ["ai","ioc"].includes(getSource(e))).length,
    MANUAL:   entries.filter((e) => getSource(e) === "manual").length,
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">Timeline</h1>
          <p className="text-muted text-xs mt-0.5">{entries.length} event{entries.length !== 1 ? "s" : ""} recorded</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 bg-accent text-background px-3 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
          </svg>
          Add Observation
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
        </svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search timeline events..."
          className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors" />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === key
                ? "bg-accent text-background border-accent"
                : "border-border text-muted hover:text-foreground hover:border-accent/40"
            }`}>
            {label}
            {counts[key] > 0 && (
              <span className={`ml-1.5 ${filter === key ? "opacity-70" : "text-muted"}`}>{counts[key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline list */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-muted">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-1">
            {filter !== "ALL" ? `No ${filter.toLowerCase()} events` : "No events yet"}
          </p>
          <p className="text-muted text-sm mb-4">
            {filter !== "ALL" ? "Try a different filter"
              : "Events are recorded automatically as you work. Add an observation to get started."}
          </p>
          {filter === "ALL" && (
            <button onClick={() => setModalOpen(true)}
              className="bg-accent text-background px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors">
              Add Observation
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />
          <div className="space-y-0">
            {paginated.map((entry) => {
              const isManual = getSource(entry) === "manual";
              const userName = entry.user?.name ?? "System";
              const isSystem = !entry.user;
              const description = entry.description ?? entry.action ?? "";
              const title = entry.title;

              return (
                <div key={entry.eventId ?? entry.id} className="relative flex gap-4 group">
                  <div className="relative z-10 mt-3">
                    <EntryIcon entry={entry} />
                  </div>
                  <div className={`flex-1 mb-3 rounded-xl border transition-colors ${
                    isManual ? "bg-accent/5 border-accent/20" : "bg-surface border-border"
                  }`}>
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            {isManual && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded">
                                Observation
                              </span>
                            )}
                            {title && title !== description && (
                              <span className="text-xs font-semibold text-foreground">{title}</span>
                            )}
                            {entry.severity && <SeverityBadge severity={entry.severity} />}
                          </div>
                          <p className="text-sm text-foreground leading-snug">{description}</p>
                          {entry.executionId && (
                            <p className="text-xs text-muted mt-0.5">Execution: {entry.executionId}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted whitespace-nowrap shrink-0 mt-0.5 cursor-default"
                          title={fullDate(entry.createdAt)}>
                          {relativeTime(entry.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {isSystem ? (
                          <span className="flex items-center gap-1.5 text-xs text-muted">
                            <span className="w-4 h-4 rounded-full bg-surface-2 border border-border flex items-center justify-center">
                              <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" className="text-muted">
                                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
                              </svg>
                            </span>
                            System
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-muted">
                            <Avatar name={userName} />
                            {userName}
                          </span>
                        )}
                        <span className="text-muted text-xs">·</span>
                        <span className="text-xs text-muted">{fullDate(entry.createdAt)}</span>
                        <span className="text-muted text-xs">·</span>
                        <span className="text-xs text-muted capitalize">{entry.source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/80 pt-4 mt-4 text-xs text-muted">
              <span>Showing {pagination.offset + 1} to {Math.min(filtered.length, pagination.offset + pagination.limit)} of {filtered.length} events</span>
              <div className="flex items-center gap-2">
                <button onClick={pagination.prevPage} disabled={!pagination.hasPrevPage}
                  className="px-2.5 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all">Previous</button>
                <span className="font-mono px-2">Page {pagination.page} of {pagination.totalPages}</span>
                <button onClick={pagination.nextPage} disabled={!pagination.hasNextPage}
                  className="px-2.5 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <ObservationModal projectId={projectId} onAdded={handleAdded} onClose={() => setModalOpen(false)} />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-surface border border-border rounded-lg px-4 py-3 text-sm text-foreground shadow-lg flex items-center gap-2 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}
