"use client";

import { useState } from "react";
import { useCaseFlows } from "@/hooks/useCaseFlows";
import { usePagination } from "@/hooks/usePagination";
import type { CasePriority, CaseStatus, CaseFlow } from "@/types/api";

interface Props { projectId: string }

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  open:        { bg: "bg-green-500/10",  text: "text-green-400" },
  in_progress: { bg: "bg-accent/10",     text: "text-accent" },
  pending:     { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  resolved:    { bg: "bg-blue-500/10",   text: "text-blue-400" },
  closed:      { bg: "bg-surface-2",     text: "text-muted" },
  reopened:    { bg: "bg-orange-500/10", text: "text-orange-400" },
};

const PRIORITY_STYLE: Record<string, string> = {
  critical: "text-red-400", high: "text-orange-400", medium: "text-yellow-400", low: "text-blue-400",
};

const STATUSES: CaseStatus[] = ["open","in_progress","pending","resolved","closed","reopened"];
const PRIORITIES: CasePriority[] = ["critical","high","medium","low"];

function CreateCaseModal({ projectId, onClose, onCreate }: { projectId: string; onClose: () => void; onCreate: () => void }) {
  const { create } = useCaseFlows(projectId);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<CasePriority>("medium");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setErr("Title is required"); return; }
    setLoading(true); setErr("");
    try { await create({ title: title.trim(), description: desc.trim() || undefined, priority }); onCreate(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed to create"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground">New Case</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Case title..." className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none" placeholder="Optional..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as CasePriority)} className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-xs font-semibold border border-border rounded-lg text-muted hover:text-foreground transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-3 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50">{loading ? "Creating…" : "Create Case"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CaseFlowClient({ projectId }: Props) {
  const { cases, loading, error, refresh, close, reopen, update, select, selected } = useCaseFlows(projectId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const { addNote, addTask } = useCaseFlows(projectId);
  const [taskTitle, setTaskTitle] = useState("");

  const filtered = cases.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !search || (c.title || "").toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchPriority = priorityFilter === "ALL" || c.priority === priorityFilter;
    return matchQ && matchStatus && matchPriority;
  });

  const pagination = usePagination({ initialLimit: 20, initialTotal: filtered.length });
  const paginated = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

  const openCount = cases.filter(c => c.status === 'open' || c.status === 'in_progress').length;
  const closedCount = cases.filter(c => c.status === 'closed' || c.status === 'resolved').length;

  if (loading) return (
    <div className="p-6">
      <div className="h-7 w-32 bg-surface-2 rounded animate-pulse mb-5" />
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-surface-2 rounded-xl mb-2 animate-pulse" />)}
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
      {showCreate && <CreateCaseModal projectId={projectId} onClose={() => setShowCreate(false)} onCreate={() => setShowCreate(false)} />}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-foreground">Case Flow</h1>
          <p className="text-muted text-xs mt-0.5">{openCount} open · {closedCount} closed</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="px-3 py-2 text-xs border border-border rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-all">Refresh</button>
          <button onClick={() => setShowCreate(true)} className="px-3 py-2 text-xs bg-accent text-white rounded-lg hover:bg-accent/80 transition-all font-semibold">+ New Case</button>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4 text-2xl">📁</div>
          <p className="text-foreground font-medium mb-1">No Cases Open</p>
          <p className="text-muted text-sm max-w-xs mb-4">Create a case to track an investigation, assign tasks, and document findings.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent/80 transition-all">Create Case</button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cases..." className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="ALL">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="ALL">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex gap-5">
            <div className="flex-1 min-w-0">
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted">Case</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden sm:table-cell">Priority</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden md:table-cell">Owner</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted hidden lg:table-cell">Tasks</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-muted text-sm">No results</td></tr>
                    ) : paginated.map(c => {
                      const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.open;
                      const isSelected = selected?.id === c.id;
                      return (
                        <tr key={c.id} onClick={() => select(isSelected ? null : c)} className={`border-b border-border last:border-0 cursor-pointer transition-colors ${isSelected ? "bg-accent/5" : "hover:bg-surface-2/60"}`}>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-foreground">{c.title}</p>
                            {c.description && <p className="text-xs text-muted truncate max-w-xs mt-0.5">{c.description}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}>{c.status.replace(/_/g, ' ')}</span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className={`text-xs font-semibold capitalize ${PRIORITY_STYLE[c.priority] ?? "text-muted"}`}>{c.priority}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs text-muted">{c.ownerName ?? '—'}</td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs font-mono text-muted">{c.tasks.length}</td>
                          <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {(c.status !== 'closed' && c.status !== 'resolved') && (
                                <button onClick={() => close(c.id)} title="Close" className="p-1.5 text-xs text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">✓</button>
                              )}
                              {(c.status === 'closed' || c.status === 'resolved') && (
                                <button onClick={() => reopen(c.id)} title="Reopen" className="p-1.5 text-xs text-muted hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all">↺</button>
                              )}
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
                      <button onClick={pagination.prevPage} disabled={!pagination.hasPrevPage} className="px-2.5 py-1.5 border border-border rounded-lg bg-surface disabled:opacity-50">Previous</button>
                      <button onClick={pagination.nextPage} disabled={!pagination.hasNextPage} className="px-2.5 py-1.5 border border-border rounded-lg bg-surface disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selected && (
              <div className="w-80 shrink-0 bg-surface border border-border rounded-xl p-5 h-fit sticky top-4 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-bold text-foreground">{selected.title}</p>
                  <button onClick={() => select(null)} className="text-muted hover:text-foreground transition-colors text-sm">✕</button>
                </div>
                {selected.description && <p className="text-xs text-muted leading-relaxed">{selected.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-surface-2 rounded-lg p-2"><p className="text-muted mb-0.5">Status</p><p className={`font-medium ${STATUS_STYLE[selected.status]?.text ?? "text-foreground"}`}>{selected.status.replace(/_/g, ' ')}</p></div>
                  <div className="bg-surface-2 rounded-lg p-2"><p className="text-muted mb-0.5">Priority</p><p className={`font-medium capitalize ${PRIORITY_STYLE[selected.priority]}`}>{selected.priority}</p></div>
                </div>
                {/* Change status */}
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1.5">Change Status</p>
                  <select defaultValue={selected.status} onChange={e => update(selected.id, { status: e.target.value as CaseStatus })} className="w-full bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                {/* Tasks */}
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1.5">Tasks ({selected.tasks.length})</p>
                  {selected.tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 py-1 text-xs">
                      <span className={`w-2 h-2 rounded-full ${t.status === 'done' ? 'bg-green-400' : t.status === 'in_progress' ? 'bg-yellow-400' : 'bg-muted'}`} />
                      <span className={t.status === 'done' ? 'line-through text-muted' : 'text-foreground'}>{t.title}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="New task title..." className="flex-1 bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
                    <button onClick={async () => { if (taskTitle.trim()) { await addTask(selected.id, { title: taskTitle.trim() }); setTaskTitle(""); } }} className="px-2 py-1 text-xs bg-accent text-white rounded-lg hover:bg-accent/80 transition-all">Add</button>
                  </div>
                </div>
                {/* Notes */}
                <div>
                  <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1.5">Notes ({selected.notes.length})</p>
                  {selected.notes.map(n => (
                    <div key={n.id} className="bg-surface-2 rounded-lg p-2 mb-1 text-xs text-foreground">{n.content}</div>
                  ))}
                  {addingNote ? (
                    <div className="space-y-2">
                      <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={2} className="w-full bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none" placeholder="Write a note..." />
                      <div className="flex gap-1">
                        <button onClick={async () => { if (noteContent.trim()) { await addNote(selected.id, { content: noteContent.trim() }); setNoteContent(""); setAddingNote(false); }}} className="px-2 py-1 text-xs bg-accent text-white rounded-lg hover:bg-accent/80 transition-all">Save</button>
                        <button onClick={() => { setAddingNote(false); setNoteContent(""); }} className="px-2 py-1 text-xs border border-border rounded-lg text-muted hover:text-foreground transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingNote(true)} className="text-xs text-accent hover:underline">+ Add note</button>
                  )}
                </div>
                <p className="text-[10px] text-muted">Created {new Date(selected.createdAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
