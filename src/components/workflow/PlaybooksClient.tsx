"use client";

import { useState, useCallback } from "react";
import { usePlaybooks } from "@/hooks/usePlaybooks";
import { usePagination } from "@/hooks/usePagination";
import type { Playbook, PlaybookCategory, PlaybookPriority, CreatePlaybookRequest, Automation } from "@/types/api";
import PlaybookEditModal from "./PlaybookEditModal";

interface Props { projectId: string }

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active:   { bg: "bg-green-500/10",  text: "text-green-400" },
  inactive: { bg: "bg-surface-2",     text: "text-muted" },
  archived: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  draft:    { bg: "bg-blue-500/10",   text: "text-blue-400" },
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-400", high: "bg-orange-400", medium: "bg-yellow-400", low: "bg-blue-400",
};

const CATEGORIES: PlaybookCategory[] = ["incident_response","threat_hunting","forensics","compliance","remediation","custom"];
const PRIORITIES: PlaybookPriority[] = ["critical","high","medium","low"];

// Create prop is passed in so this component has NO hooks that trigger side-effects
function CreateModal({
  onClose,
  onCreate,
  create,
}: {
  onClose: () => void;
  onCreate: (p: Playbook) => void;
  create: (payload: CreatePlaybookRequest) => Promise<Playbook>;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<PlaybookCategory>("incident_response");
  const [priority, setPriority] = useState<PlaybookPriority>("medium");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Name is required"); return; }
    setLoading(true); setErr("");
    try {
      const p = await create({ name: name.trim(), description: desc.trim() || undefined, category, priority });
      onCreate(p);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground">New Playbook</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ransomware Response" className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none" placeholder="Optional description..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as PlaybookCategory)} className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as PlaybookPriority)} className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-xs font-semibold border border-border rounded-lg text-muted hover:text-foreground transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-3 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50">
              {loading ? "Creating…" : "Create Playbook"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Execution toast ─────────────────────────────────────────────────────────

interface ExecToast {
  id: string;
  playbookName: string;
  status: "success" | "error";
  message: string;
  execution?: Automation;
}

export default function PlaybooksClient({ projectId }: Props) {
  const { playbooks, loading, error, refresh, create, update, remove, duplicate, execute, setEnabled, archive, select, selected } = usePlaybooks(projectId);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [execToasts, setExecToasts] = useState<ExecToast[]>([]);
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());

  const handleExecute = useCallback(async (p: Playbook) => {
    if (executingIds.has(p.id)) return;
    console.log('[PlaybooksClient] [1] Execute button clicked — playbookId:', p.id, 'name:', p.name);
    setExecutingIds(prev => new Set(prev).add(p.id));
    try {
      console.log('[PlaybooksClient] [2] Calling workflowStore.executePlaybook via execute() hook...');
      const result = await execute(p.id);
      console.log('[PlaybooksClient] [3] execute() resolved — POST response:', JSON.stringify(result));
      console.log('[PlaybooksClient] [4] State update should have been applied inside store — execution injected');
      const toast: ExecToast = {
        id: result.id,
        playbookName: p.name,
        status: "success",
        message: `Execution started — status: ${result.status}`,
        execution: result,
      };
      setExecToasts(prev => [toast, ...prev].slice(0, 5));
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        setExecToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 8000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Execution failed";
      const toast: ExecToast = {
        id: `err-${Date.now()}`,
        playbookName: p.name,
        status: "error",
        message: msg,
      };
      setExecToasts(prev => [toast, ...prev].slice(0, 5));
      setTimeout(() => {
        setExecToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 8000);
    } finally {
      setExecutingIds(prev => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }
  }, [execute, executingIds]);

  const filtered = playbooks.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !search || (p.name || "").toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
    const matchCat = catFilter === "ALL" || p.category === catFilter;
    const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchQ && matchCat && matchStatus;
  });

  const pagination = usePagination({ initialLimit: 20, initialTotal: filtered.length });
  const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

  function handleCreated(_p: Playbook) {
    setShowCreate(false);
    refresh();
  }

  function handleEdited(updated: Playbook) {
    setEditingPlaybook(null);
    // If the updated playbook is the currently selected one, keep it in sync
    if (selected?.id === updated.id) select(updated);
    refresh();
  }

  if (loading) return (
    <div className="p-6">
      <div className="h-7 w-40 bg-surface-2 rounded animate-pulse mb-5" />
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-border last:border-0 animate-pulse">
            <div className="h-4 w-40 bg-surface-2 rounded" /><div className="h-4 w-20 bg-surface-2 rounded" /><div className="h-4 w-16 bg-surface-2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[40vh]">
      <p className="text-red-400 text-sm mb-3">{error}</p>
      <button onClick={refresh} className="text-xs text-accent hover:underline">Retry</button>
    </div>
  );

  return (
    <div className="p-6">
      {/* Execution toasts */}
      {execToasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80">
          {execToasts.map(t => (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-xs backdrop-blur-sm ${
                t.status === "success"
                  ? "bg-green-500/10 border-green-500/20 text-green-300"
                  : "bg-red-500/10 border-red-500/20 text-red-300"
              }`}
            >
              <span className="text-base mt-0.5">{t.status === "success" ? "▶" : "✕"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{t.playbookName}</p>
                <p className="text-muted mt-0.5">{t.message}</p>
                {t.execution && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      t.execution.status === "running"
                        ? "bg-green-500/20 text-green-300"
                        : t.execution.status === "completed"
                        ? "bg-accent/20 text-accent"
                        : "bg-red-500/20 text-red-300"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${t.execution.status === "running" ? "bg-green-400 animate-pulse" : "bg-current"}`} />
                      {t.execution.status}
                    </span>
                    <span className="text-muted font-mono">{t.execution.progress ?? 0}%</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setExecToasts(prev => prev.filter(x => x.id !== t.id))}
                className="text-muted hover:text-foreground transition-colors shrink-0 mt-0.5"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {showCreate && (
        <CreateModal
          create={create}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreated}
        />
      )}
      {editingPlaybook && (
        <PlaybookEditModal
          playbook={editingPlaybook}
          update={update}
          onClose={() => setEditingPlaybook(null)}
          onSave={handleEdited}
        />
      )}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">Playbooks</h1>
          <p className="text-muted text-xs mt-0.5">{playbooks.length} playbook{playbooks.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="px-3 py-2 text-xs border border-border rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-all">Refresh</button>
          <button onClick={() => setShowCreate(true)} className="px-3 py-2 text-xs bg-accent text-white rounded-lg hover:bg-accent/80 transition-all font-semibold">+ New Playbook</button>
        </div>
      </div>

      {playbooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-2xl">📋</div>
          <p className="text-foreground font-medium mb-1">No Playbooks Yet</p>
          <p className="text-muted text-sm max-w-xs mb-4">Create your first playbook to start automating incident response workflows.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent/80 transition-all">Create Playbook</button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search playbooks..." className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition-colors" />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="ALL">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="ALL">All Statuses</option>
              {["active","inactive","archived","draft"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex gap-5">
            <div className="flex-1 min-w-0">
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden sm:table-cell">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden md:table-cell">Steps</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden lg:table-cell">Priority</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-muted text-sm">No results match your search</td></tr>
                    ) : paginated.map(p => {
                      const st = STATUS_STYLE[p.status] ?? STATUS_STYLE.draft;
                      const isSelected = selected?.id === p.id;
                      return (
                        <tr key={p.id} onClick={() => select(isSelected ? null : p)} className={`border-b border-border last:border-0 cursor-pointer transition-colors ${isSelected ? "bg-accent/5" : "hover:bg-surface-2/60"}`}>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-foreground">{p.name}</p>
                            {p.description && <p className="text-xs text-muted truncate max-w-xs mt-0.5">{p.description}</p>}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted capitalize">{p.category?.replace(/_/g, ' ') ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs text-muted font-mono">{p.stepCount}</td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium capitalize`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[p.priority] ?? "bg-muted"}`} />{p.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleExecute(p)}
                                title="Execute"
                                disabled={executingIds.has(p.id)}
                                className="p-1.5 text-xs text-muted hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-wait"
                              >
                                {executingIds.has(p.id) ? (
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="animate-spin">
                                    <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                                  </svg>
                                ) : "▶"}
                              </button>
                              <button onClick={() => {
                                console.log('[PlaybooksClient] Opening edit modal — editingPlaybook:', JSON.stringify(p));
                                console.log('[PlaybooksClient] editingPlaybook.id:', p.id);
                                console.log('[PlaybooksClient] editingPlaybook.playbookId:', (p as any).playbookId);
                                setEditingPlaybook(p);
                              }} title="Edit Steps" className="p-1.5 text-xs text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all">✏</button>
                              <button onClick={() => duplicate(p.id)} title="Duplicate" className="p-1.5 text-xs text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all">⧉</button>
                              <button onClick={() => setEnabled(p.id, p.status !== 'active')} title={p.status === 'active' ? 'Disable' : 'Enable'} className="p-1.5 text-xs text-muted hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all">{p.status === 'active' ? '⏸' : '▷'}</button>
                              <button onClick={() => archive(p.id)} title="Archive" className="p-1.5 text-xs text-muted hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all">🗄</button>
                              <button onClick={() => remove(p.id)} title="Delete" className="p-1.5 text-xs text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">🗑</button>
                            </div>
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

            {selected && (
              <div className="w-72 shrink-0 bg-surface border border-border rounded-xl p-5 h-fit sticky top-4 space-y-4">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-bold text-foreground">{selected.name}</p>
                  <button onClick={() => select(null)} className="text-muted hover:text-foreground transition-colors">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
                  </button>
                </div>
                {selected.description && <p className="text-xs text-muted leading-relaxed">{selected.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-surface-2 rounded-lg p-2"><p className="text-muted mb-0.5">Category</p><p className="font-medium text-foreground capitalize">{selected.category?.replace(/_/g, ' ') ?? '—'}</p></div>
                  <div className="bg-surface-2 rounded-lg p-2"><p className="text-muted mb-0.5">Priority</p><p className="font-medium capitalize" style={{color: selected.priority === 'critical' ? '#f87171' : selected.priority === 'high' ? '#fb923c' : selected.priority === 'medium' ? '#facc15' : '#60a5fa'}}>{selected.priority}</p></div>
                  <div className="bg-surface-2 rounded-lg p-2"><p className="text-muted mb-0.5">Steps</p><p className="font-mono font-semibold text-foreground">{selected.stepCount}</p></div>
                  <div className="bg-surface-2 rounded-lg p-2"><p className="text-muted mb-0.5">Triggered</p><p className="font-mono font-semibold text-foreground">{selected.triggerCount}</p></div>
                </div>
                {selected.author && <div><p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Author</p><p className="text-xs text-foreground">{selected.author}</p></div>}
                {selected.tags && selected.tags.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">{selected.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted">{t}</span>)}</div>
                  </div>
                )}
                <p className="text-[10px] text-muted">Created {new Date(selected.createdAt).toLocaleDateString()}</p>
                {/* Steps summary in detail panel */}
                {selected.steps && selected.steps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-2">Steps</p>
                    <div className="space-y-1">
                      {[...selected.steps].sort((a, b) => a.order - b.order).map((step, i) => (
                        <div key={step.id} className="flex items-start gap-2">
                          <span className="w-4 h-4 shrink-0 rounded-full bg-surface-2 border border-border text-[9px] font-bold text-muted flex items-center justify-center mt-0.5">{i + 1}</span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-foreground leading-tight truncate">{step.name}</p>
                            <p className="text-[10px] text-muted capitalize">{step.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    console.log('[PlaybooksClient] Opening edit modal from detail panel — selected:', JSON.stringify(selected));
                    console.log('[PlaybooksClient] selected.id:', selected.id);
                    console.log('[PlaybooksClient] selected.playbookId:', (selected as any).playbookId);
                    setEditingPlaybook(selected);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-accent/10 text-accent border border-accent/20 rounded-lg hover:bg-accent/20 transition-all"
                >
                  ✏ Edit Steps
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
