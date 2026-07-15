"use client";

import { useEffect, useRef, useState } from "react";

const ASSET_TYPES = ["Server", "Workstation", "Router", "Switch", "Firewall", "Other"];

const severityConfig: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/20" },
  HIGH:     { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/20" },
  MEDIUM:   { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/20" },
  LOW:      { bg: "bg-blue-500/15",   text: "text-blue-400",   border: "border-blue-500/20" },
  INFO:     { bg: "bg-surface-2",     text: "text-muted",      border: "border-border" },
};

export interface AssetRow {
  id: string;
  ip: string | null;
  hostname: string | null;
  type: string;
  tags: string[];
  notes: string | null;
  createdAt: string;
  _count: { findings: number };
}

interface Finding {
  id: string;
  type: string;
  severity: string;
  description: string;
  createdAt: string;
}

interface Props {
  projectId: string;
  asset: AssetRow | null;       // null = "add new" mode
  open: boolean;
  onClose: () => void;
  onSaved: (asset: AssetRow) => void;
  onDeleted?: (id: string) => void;
}

export default function AssetSlideOver({
  projectId,
  asset,
  open,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const isEdit = !!asset;

  const [ip, setIp] = useState("");
  const [hostname, setHostname] = useState("");
  const [type, setType] = useState("Server");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  // Populate form when asset changes
  useEffect(() => {
    if (open) {
      if (asset) {
        setIp(asset.ip ?? "");
        setHostname(asset.hostname ?? "");
        setType(asset.type);
        setTags(Array.isArray(asset.tags) ? asset.tags.join(", ") : "");
        setNotes(asset.notes ?? "");
        // Fetch findings for this asset
        setLoadingFindings(true);
        fetch(`/api/projects/${projectId}/assets/${asset.id}`)
          .then((r) => r.json())
          .then((d) => setFindings(d.asset?.findings ?? []))
          .finally(() => setLoadingFindings(false));
      } else {
        setIp(""); setHostname(""); setType("Server");
        setTags(""); setNotes(""); setFindings([]);
      }
      setError("");
      setConfirmDelete(false);
      setTimeout(() => firstRef.current?.focus(), 60);
    }
  }, [open, asset, projectId]);

  // Escape to close
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isEdit
      ? `/api/projects/${projectId}/assets/${asset!.id}`
      : `/api/projects/${projectId}/assets`;
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, hostname, type, tags, notes }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || "Failed to save"); return; }
    onSaved(data.asset);
    onClose();
  }

  async function handleDelete() {
    if (!asset) return;
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/assets/${asset.id}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (res.ok) { onDeleted?.(asset.id); onClose(); }
    else setError("Failed to delete asset");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-surface border-l border-border h-full flex flex-col shadow-2xl animate-slide-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground">
            {isEdit ? "Edit Asset" : "Add Asset"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors p-1 rounded"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <form id="asset-form" onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="asset-ip">
                  IP Address
                </label>
                <input
                  ref={firstRef}
                  id="asset-ip"
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="192.168.1.1"
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="asset-hostname">
                  Hostname
                </label>
                <input
                  id="asset-hostname"
                  type="text"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  placeholder="server.internal"
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="asset-type">
                Asset Type <span className="text-danger">*</span>
              </label>
              <select
                id="asset-type"
                required
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="asset-tags">
                Tags
                <span className="text-muted font-normal ml-1">(comma-separated)</span>
              </label>
              <input
                id="asset-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="critical, gateway, dmz"
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="asset-notes">
                Notes
              </label>
              <textarea
                id="asset-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional context about this asset..."
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-danger text-sm bg-danger-dim border border-danger/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}
          </form>

          {/* Findings section (edit mode only) */}
          {isEdit && (
            <div className="px-5 pb-5">
              <div className="border-t border-border pt-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                  Findings ({asset!._count.findings})
                </h3>
                {loadingFindings ? (
                  <p className="text-muted text-sm">Loading...</p>
                ) : findings.length === 0 ? (
                  <p className="text-muted text-sm">No findings attached to this asset.</p>
                ) : (
                  <ul className="space-y-2">
                    {findings.map((f) => {
                      const cfg = severityConfig[f.severity] ?? severityConfig.INFO;
                      return (
                        <li
                          key={f.id}
                          className="flex items-start gap-2.5 p-3 bg-surface-2 rounded-lg border border-border"
                        >
                          <span
                            className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          >
                            {f.severity.slice(0, 1)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{f.type}</p>
                            <p className="text-xs text-muted mt-0.5 line-clamp-2">{f.description}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border text-foreground py-2 rounded-lg text-sm font-medium hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="asset-form"
              disabled={loading}
              className="flex-1 bg-accent text-background py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Asset"}
            </button>
          </div>

          {/* Delete */}
          {isEdit && (
            confirmDelete ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 border border-border text-muted py-2 rounded-lg text-sm hover:bg-surface-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 bg-danger text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full text-danger text-sm py-2 rounded-lg border border-danger/20 hover:bg-danger-dim transition-colors"
              >
                Delete Asset
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
