"use client";

/**
 * PlaybookEditModal
 *
 * Full-featured edit modal for an existing Playbook.
 * Manages playbook metadata (name, description, category, priority, tags)
 * AND step authoring via PlaybookStepEditor.
 *
 * Saving calls PUT /api/projects/:id/workflow/playbooks/:playbookId
 * with the complete { name, description, category, priority, tags, steps } payload.
 */

import { useState } from "react";
import type {
  Playbook,
  PlaybookCategory,
  PlaybookPriority,
  PlaybookStep,
  UpdatePlaybookRequest,
} from "@/types/api";
import PlaybookStepEditor from "./PlaybookStepEditor";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: PlaybookCategory[] = [
  "incident_response",
  "threat_hunting",
  "forensics",
  "compliance",
  "remediation",
  "custom",
];

const PRIORITIES: PlaybookPriority[] = ["critical", "high", "medium", "low"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  playbook: Playbook;
  onClose: () => void;
  onSave: (updated: Playbook) => void;
  update: (id: string, payload: UpdatePlaybookRequest) => Promise<Playbook>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlaybookEditModal({ playbook, onClose, onSave, update }: Props) {
  const [name, setName]         = useState(playbook.name);
  const [desc, setDesc]         = useState(playbook.description ?? "");
  const [category, setCategory] = useState<PlaybookCategory>(playbook.category);
  const [priority, setPriority] = useState<PlaybookPriority>(playbook.priority);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags]         = useState<string[]>(playbook.tags ?? []);
  const [steps, setSteps]       = useState<PlaybookStep[]>(
    // Ensure steps are sorted by their order field on load
    [...(playbook.steps ?? [])].sort((a, b) => a.order - b.order)
  );

  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  // ── Tag helpers ───────────────────────────────────────────────────────────

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  function onTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Name is required"); return; }
    setSaving(true);
    setErr("");
    try {
      console.log('[PlaybookEditModal] handleSave() called');
      console.log('[PlaybookEditModal] playbook prop:', JSON.stringify(playbook));
      console.log('[PlaybookEditModal] playbook.id:', playbook.id);
      console.log('[PlaybookEditModal] playbook.playbookId:', (playbook as any).playbookId);
      const payload: UpdatePlaybookRequest = {
        name: name.trim(),
        description: desc.trim() || undefined,
        category,
        priority,
        tags,
        steps,
      };
      console.log('[PlaybookEditModal] calling update() with id =', playbook.id, '| payload keys:', Object.keys(payload));
      const updated = await update(playbook.id, payload);
      onSave(updated);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save playbook");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground">Edit Playbook</h2>
            <p className="text-xs text-muted mt-0.5">{playbook.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {/* ── Metadata ─────────────────────────────────────────────── */}
            <section>
              <p className="text-[10px] font-bold text-muted/60 uppercase tracking-widest mb-3">
                Playbook Details
              </p>
              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ransomware Response"
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Description</label>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={2}
                    placeholder="Optional description…"
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>

                {/* Category + Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as PlaybookCategory)}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as PlaybookPriority)}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Tags</label>
                  <div className="min-h-[36px] flex flex-wrap gap-1 bg-surface-2 border border-border rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-accent">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-muted"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="hover:text-red-400 transition-colors leading-none"
                          aria-label={`Remove tag ${t}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={onTagKey}
                      onBlur={addTag}
                      placeholder={tags.length === 0 ? "tag1, tag2…" : ""}
                      className="flex-1 min-w-[80px] bg-transparent text-xs text-foreground placeholder:text-muted outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-muted mt-0.5">Press Enter or comma to add a tag</p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <hr className="border-border" />

            {/* ── Steps ────────────────────────────────────────────────── */}
            <section>
              <PlaybookStepEditor steps={steps} onChange={setSteps} />
            </section>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 shrink-0">
            <p className="text-xs text-muted">{steps.length} step{steps.length !== 1 ? "s" : ""}</p>
            {err && <p className="text-xs text-red-400 flex-1 text-center">{err}</p>}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold border border-border rounded-lg text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Playbook"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
