"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { investigationStore } from "@/store/investigation";
import { usePagination } from "@/hooks/usePagination";

// ── Types ──────────────────────────────────────────────────────────────────────

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface FindingRow {
  id: string;
  type: string;
  severity: Severity;
  description: string;
  createdAt: string;
  asset: { id: string; ip: string | null; hostname: string | null; type: string } | null;
}

interface AssetOption {
  id: string;
  ip: string | null;
  hostname: string | null;
  type: string;
}

interface Props {
  projectId: string;
  initialFindings: FindingRow[];
  assets: AssetOption[];
}

// ── Config ─────────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

const SEV: Record<Severity, { bg: string; text: string; border: string; dot: string }> = {
  CRITICAL: { bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/30",    dot: "bg-red-400" },
  HIGH:     { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-400" },
  MEDIUM:   { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30", dot: "bg-yellow-400" },
  LOW:      { bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/30",   dot: "bg-blue-400" },
  INFO:     { bg: "bg-surface-2",     text: "text-muted",      border: "border-border",         dot: "bg-muted" },
};

function assetLabel(a: AssetOption | null) {
  if (!a) return "Unknown";
  return a.ip ?? a.hostname ?? a.type;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Add/Edit Form ──────────────────────────────────────────────────────────────

interface FormProps {
  projectId: string;
  assets: AssetOption[];
  finding?: FindingRow;           // undefined = add mode
  onSaved: (f: FindingRow) => void;
  onCancel: () => void;
  onDeleted?: (id: string) => void;
}

function FindingForm({ projectId, assets, finding, onSaved, onCancel, onDeleted }: FormProps) {
  const isEdit = !!finding;
  const [assetId, setAssetId] = useState(finding?.asset?.id ?? (assets[0]?.id ?? ""));
  const [type, setType] = useState(finding?.type ?? "");
  const [severity, setSeverity] = useState<Severity>(finding?.severity ?? "MEDIUM");
  const [description, setDescription] = useState(finding?.description ?? "");
  const [assetSearch, setAssetSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filteredAssets = assets.filter((a) => {
    if (!assetSearch) return true;
    const q = assetSearch.toLowerCase();
    return (
      a.ip?.toLowerCase().includes(q) ||
      a.hostname?.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q)
    );
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId || !type.trim() || !description.trim()) {
      setError("Asset, type, and description are required");
      return;
    }
    setError("");
    setLoading(true);

    const url = isEdit
      ? `/api/projects/${projectId}/findings/${finding!.id}`
      : `/api/projects/${projectId}/findings`;

    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, type, severity, description }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Failed to save"); return; }
    onSaved(data.finding);
  }

  async function handleDelete() {
    if (!finding) return;
    setLoading(true);
    const res = await fetch(
      `/api/projects/${projectId}/findings/${finding.id}`,
      { method: "DELETE" }
    );
    setLoading(false);
    if (res.ok) onDeleted?.(finding.id);
    else setError("Failed to delete");
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-surface-2 border-t border-border space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Asset */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Asset <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            placeholder="Search assets..."
            value={assetSearch}
            onChange={(e) => setAssetSearch(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent mb-1.5 transition-colors"
          />
          <select
            required
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
          >
            {filteredAssets.length === 0 && (
              <option value="">No assets found</option>
            )}
            {filteredAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {assetLabel(a)} ({a.type})
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Finding Type <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="e.g. SQL Injection, XSS, Open Port"
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
          />
        </div>

        {/* Severity */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Severity <span className="text-danger">*</span>
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
          >
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1.5">
          Description <span className="text-danger">*</span>
        </label>
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the finding, impact, and reproduction steps..."
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors resize-none"
        />
      </div>

      {error && (
        <p className="text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="border border-border text-muted px-4 py-1.5 rounded-lg text-xs hover:bg-surface transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-background px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Finding"}
        </button>

        {isEdit && !confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="ml-auto text-xs text-danger hover:opacity-80 transition-opacity"
          >
            Delete
          </button>
        )}
        {isEdit && confirmDelete && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted">Sure?</span>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              No
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="text-xs text-danger font-semibold hover:opacity-80 transition-opacity"
            >
              Yes, delete
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FindingsClient({ projectId, initialFindings, assets }: Props) {
  const [storeState, setStoreState] = useState(investigationStore.getState());
  const [filter, setFilter] = useState<Severity | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "date" | "type">("severity");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [toast, setToast] = useState("");

  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  useEffect(() => {
    // Seed initialFindings if not present in store
    if (investigationStore.getState().findings.length === 0) {
      investigationStore.setState({ findings: initialFindings as unknown as import('@/types/api').Finding[] });
    }
    const unsubscribe = investigationStore.subscribe((state) => {
      setStoreState(state);
    });
    // Load fresh data
    investigationStore.loadFindings(projectId);
    return () => unsubscribe();
  }, [projectId, initialFindings]);

  // Auto-expand finding when ?highlight=<findingId> is present (from global search)
  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (!highlightId) return;

    const exists = storeState.findings.find((f) => f.id === highlightId);
    if (exists) {
      setExpandedId(highlightId);
      setTimeout(() => {
        document.getElementById(`finding-row-${highlightId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("highlight");
      const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [storeState.findings]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const findings = storeState.findings as unknown as FindingRow[];

  // Severity counts
  const counts = SEVERITY_ORDER.reduce((acc, s) => {
    acc[s] = findings.filter((f) => f.severity === s).length;
    return acc;
  }, {} as Record<Severity, number>);

  // Filtered
  const filtered = findings.filter((f) => {
    const matchesSearch = !search ||
      f.type.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase());
    
    const matchesSeverity = filter === "ALL" || f.severity === filter;
    
    return matchesSearch && matchesSeverity;
  });

  // Sorted
  const sorted = [...filtered].sort((a, b) => {
    let valA: any;
    let valB: any;
    if (sortBy === "severity") {
      valA = SEVERITY_ORDER.indexOf(a.severity);
      valB = SEVERITY_ORDER.indexOf(b.severity);
    } else if (sortBy === "type") {
      valA = a.type.toLowerCase();
      valB = b.type.toLowerCase();
    } else {
      valA = new Date(a.createdAt).getTime();
      valB = new Date(b.createdAt).getTime();
    }

    if (typeof valA === "string") {
      return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortOrder === "asc" ? valA - valB : valB - valA;
  });

  const pagination = usePagination({ initialLimit: 10, initialTotal: sorted.length });

  useEffect(() => {
    pagination.setTotal(sorted.length);
  }, [sorted.length]);

  const paginated = sorted.slice(pagination.offset, pagination.offset + pagination.limit);

  function handleSaved(finding: FindingRow) {
    const exists = storeState.findings.some((f) => f.id === finding.id);
    if (exists) {
      investigationStore.updateFindingInState(finding as any);
    } else {
      investigationStore.addFinding(finding as any);
    }
    setAddingNew(false);
    setEditingId(null);
    setExpandedId(finding.id);
    showToast(editingId ? "Finding updated" : "Finding added");
  }

  function handleDeleted(id: string) {
    investigationStore.removeFinding(id);
    setExpandedId(null);
    setEditingId(null);
    showToast("Finding deleted");
  }

  function toggleExpand(id: string) {
    if (editingId === id) return;
    setExpandedId((prev) => (prev === id ? null : id));
    setEditingId(null);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">Findings</h1>
          <p className="text-muted text-xs mt-0.5">
            {findings.length} finding{findings.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={() => { setAddingNew(true); setExpandedId(null); setEditingId(null); }}
          className="flex items-center gap-1.5 bg-accent text-background px-3 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
          </svg>
          Add Finding
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
        {SEVERITY_ORDER.map((s) => {
          const cfg = SEV[s];
          return (
            <div
              key={s}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${cfg.bg} ${cfg.border} cursor-pointer transition-opacity ${filter === s ? "opacity-100 ring-1 ring-current" : "opacity-80 hover:opacity-100"}`}
              onClick={() => setFilter((prev) => (prev === s ? "ALL" : s))}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <div>
                <p className={`text-xs font-medium ${cfg.text}`}>{s}</p>
                <p className={`text-xl font-bold leading-none mt-0.5 ${cfg.text}`}>
                  {counts[s]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search Input & Sort Options */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search findings by type or description..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
          <span>Sort by:</span>
          {[
            { key: "severity", label: "Severity" },
            { key: "date", label: "Date Added" },
            { key: "type", label: "Finding Type" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                if (sortBy === opt.key) {
                  setSortOrder(o => o === "asc" ? "desc" : "asc");
                } else {
                  setSortBy(opt.key as any);
                  setSortOrder("asc");
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg border transition-colors ${
                sortBy === opt.key
                  ? "bg-accent/15 border-accent/30 text-accent"
                  : "border-border text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              {opt.label} {sortBy === opt.key && (sortOrder === "asc" ? "▲" : "▼")}
            </button>
          ))}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            filter === "ALL"
              ? "bg-accent text-background border-accent"
              : "border-border text-muted hover:text-foreground hover:border-accent/40"
          }`}
        >
          All ({findings.length})
        </button>
        {SEVERITY_ORDER.filter((s) => counts[s] > 0).map((s) => {
          const cfg = SEV[s];
          return (
            <button
              key={s}
              onClick={() => setFilter((prev) => (prev === s ? "ALL" : s))}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === s
                  ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                  : "border-border text-muted hover:text-foreground hover:border-accent/40"
              }`}
            >
              {s} ({counts[s]})
            </button>
          );
        })}
      </div>

      {/* Add new form */}
      {addingNew && (
        <div className="mb-4 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-surface-2">
            <p className="text-sm font-semibold text-foreground">New Finding</p>
          </div>
          <FindingForm
            projectId={projectId}
            assets={assets}
            onSaved={handleSaved}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}

      {/* Table */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-muted">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1ZM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .75.75h2.5a.75.75 0 0 0 0-1.5H8.75v-2.75Zm0 6.5a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-1">
            {filter !== "ALL" ? `No ${filter} findings` : "No findings yet"}
          </p>
          <p className="text-muted text-sm mb-4">
            {filter !== "ALL"
              ? "Try a different severity filter"
              : "Add your first finding to start tracking vulnerabilities"}
          </p>
          {filter === "ALL" && !addingNew && (
            <button
              onClick={() => setAddingNew(true)}
              className="bg-accent text-background px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors"
            >
              Add Finding
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted w-28">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Asset</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden md:table-cell">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((finding) => {
                const cfg = SEV[finding.severity];
                const isExpanded = expandedId === finding.id;
                const isEditing = editingId === finding.id;

                return (
                  <>
                    <tr
                      key={finding.id}
                      id={`finding-row-${finding.id}`}
                      onClick={() => toggleExpand(finding.id)}
                      className={`border-b border-border last:border-0 cursor-pointer transition-colors ${
                        isExpanded ? "bg-surface-2" : "hover:bg-surface-2/60"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {finding.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">
                        {finding.type}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs font-mono">
                        {assetLabel(finding.asset)}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs hidden md:table-cell max-w-xs">
                        <span className="line-clamp-1">{finding.description}</span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs hidden sm:table-cell whitespace-nowrap">
                        {formatDate(finding.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        <svg
                          width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
                          className={`transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
                        >
                          <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
                        </svg>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && !isEditing && (
                      <tr key={`${finding.id}-expanded`} className="border-b border-border last:border-0 bg-surface-2">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                                Full Description
                              </p>
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {finding.description}
                              </p>
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                                <span>
                                  Asset:{" "}
                                  <span className="text-foreground font-mono">
                                    {assetLabel(finding.asset)}
                                  </span>
                                </span>
                                <span>Added {formatDate(finding.createdAt)}</span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(finding.id);
                              }}
                              className="shrink-0 flex items-center gap-1.5 border border-border text-muted hover:text-foreground hover:border-accent/40 px-3 py-1.5 rounded-lg text-xs transition-colors"
                            >
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z" />
                              </svg>
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Edit form row */}
                    {isEditing && (
                      <tr key={`${finding.id}-edit`} className="border-b border-border last:border-0">
                        <td colSpan={6} className="p-0">
                          <FindingForm
                            projectId={projectId}
                            assets={assets}
                            finding={finding}
                            onSaved={handleSaved}
                            onCancel={() => { setEditingId(null); setExpandedId(finding.id); }}
                            onDeleted={handleDeleted}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/80 p-4 text-xs text-muted bg-surface-2">
              <span>
                Showing {pagination.offset + 1} to {Math.min(sorted.length, pagination.offset + pagination.limit)} of {sorted.length} findings
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={pagination.prevPage}
                  disabled={!pagination.hasPrevPage}
                  className="px-2.5 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="font-mono px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={pagination.nextPage}
                  disabled={!pagination.hasNextPage}
                  className="px-2.5 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-surface border border-border rounded-lg px-4 py-3 text-sm text-foreground shadow-lg flex items-center gap-2 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}

