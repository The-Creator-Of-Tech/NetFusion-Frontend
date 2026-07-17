"use client";

/**
 * PlaybookStepEditor
 *
 * Inline step authoring panel embedded inside the Playbook Edit Modal.
 * Supports: Add / Edit / Delete steps, move-up / move-down reordering,
 * all required step fields (type, name, description, expectedOutcome,
 * relatedCves, relatedMitre, relatedIocs).
 */

import { useState, useMemo, useEffect } from "react";
import type { PlaybookStep, StepType } from "@/types/api";
import ActionCatalog, { ACTION_DEFINITIONS } from "./ActionCatalog";
import ConfigForm from "./ConfigForm";

// ─── Constants ────────────────────────────────────────────────────────────────

export const STEP_TYPES: { value: StepType; label: string; color: string }[] = [
  { value: "detection",      label: "Detection",      color: "text-blue-400   bg-blue-500/10"    },
  { value: "containment",    label: "Containment",    color: "text-orange-400 bg-orange-500/10"  },
  { value: "investigation",  label: "Investigation",  color: "text-purple-400 bg-purple-500/10"  },
  { value: "eradication",    label: "Eradication",    color: "text-red-400    bg-red-500/10"     },
  { value: "recovery",       label: "Recovery",       color: "text-green-400  bg-green-500/10"   },
  { value: "notification",   label: "Notification",   color: "text-yellow-400 bg-yellow-500/10"  },
  { value: "manual",         label: "Manual",         color: "text-gray-400   bg-gray-500/10"    },
  { value: "automated",      label: "Automated",      color: "text-cyan-400   bg-cyan-500/10"    },
];

export const EXECUTORS: { value: string; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "nmap", label: "Nmap" },
  { value: "packet_capture", label: "Packet Capture" },
  { value: "tshark", label: "TShark" },
  { value: "ioc", label: "IOC Analysis" },
  { value: "mitre", label: "MITRE Mapping" },
  { value: "ai", label: "AI" },
  { value: "report", label: "Report" },
];

function stepTypeStyle(type: StepType): string {
  return STEP_TYPES.find((t) => t.value === type)?.color ?? "text-muted bg-surface-2";
}

function stepTypeLabel(type: StepType): string {
  return STEP_TYPES.find((t) => t.value === type)?.label ?? type;
}

// ─── Blank step factory ───────────────────────────────────────────────────────

function blankStep(order: number): PlaybookStep {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: "manual",
    executor: "manual",
    description: "",
    expectedOutcome: "",
    relatedCves: [],
    relatedMitre: [],
    relatedIocs: [],
    order,
  };
}

// ─── Chip-list input (comma / Enter separated tags) ──────────────────────────

function ChipInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-muted mb-1">{label}</label>
      <div className="min-h-[36px] flex flex-wrap gap-1 bg-surface-2 border border-border rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-accent">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-foreground"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-muted hover:text-red-400 transition-colors leading-none"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-xs text-foreground placeholder:text-muted outline-none"
        />
      </div>
      <p className="text-[10px] text-muted mt-0.5">Press Enter or comma to add</p>
    </div>
  );
}

// ─── Single-step form ─────────────────────────────────────────────────────────

interface StepFormProps {
  step: PlaybookStep;
  steps: PlaybookStep[];
  onSave: (s: PlaybookStep) => void;
  onCancel: () => void;
}

function StepForm({ step, steps, onSave, onCancel }: StepFormProps) {
  const [name, setName]                   = useState(step.name);
  const [type, setType]                   = useState<StepType>(step.type);
  const [executor, setExecutor]           = useState<string>(step.executor ?? "manual");
  const [description, setDescription]     = useState(step.description ?? "");
  const [expectedOutcome, setExpected]    = useState(step.expectedOutcome ?? "");
  const [relatedCves, setCves]            = useState<string[]>(step.relatedCves ?? []);
  const [relatedMitre, setMitre]          = useState<string[]>(step.relatedMitre ?? []);
  const [relatedIocs, setIocs]            = useState<string[]>(step.relatedIocs ?? []);
  const [config, setConfig]               = useState<Record<string, any>>(step.config ?? {});
  const [err, setErr]                     = useState("");

  const configSchema = useMemo(() => {
    // 1. Try to match by step name or title
    let def = ACTION_DEFINITIONS.find(d => d.name.toLowerCase() === step.name.toLowerCase());
    // 2. Try to match by executor / action id
    if (!def) {
      def = ACTION_DEFINITIONS.find(d => d.executor === executor) || ACTION_DEFINITIONS.find(d => d.id === executor);
    }
    return def?.configSchema ?? {};
  }, [executor, step.name]);

  // Whenever executor changes, look up schema and populate defaults for missing keys
  useEffect(() => {
    let def = ACTION_DEFINITIONS.find(d => d.name.toLowerCase() === step.name.toLowerCase());
    if (!def || def.executor !== executor) {
      def = ACTION_DEFINITIONS.find(d => d.executor === executor) || ACTION_DEFINITIONS.find(d => d.id === executor);
    }
    const schema = def?.configSchema ?? {};
    const newConfig = { ...config };
    let changed = false;
    Object.entries(schema).forEach(([key, field]: [string, any]) => {
      if (newConfig[key] === undefined && field.default !== undefined) {
        newConfig[key] = field.default;
        changed = true;
      }
    });
    if (changed) {
      setConfig(newConfig);
    }
  }, [executor]);

  function saveStep() {
    if (!name.trim()) { setErr("Step name is required"); return; }
    onSave({
      ...step,
      name: name.trim(),
      type,
      executor,
      description:     description.trim() || undefined,
      expectedOutcome: expectedOutcome.trim() || undefined,
      relatedCves:     relatedCves.length  ? relatedCves  : undefined,
      relatedMitre:    relatedMitre.length ? relatedMitre : undefined,
      relatedIocs:     relatedIocs.length  ? relatedIocs  : undefined,
      config:          config,
    });
  }

  // Allow Enter on the name field to save the step (mirrors previous form-submit behaviour)
  function onNameKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveStep();
    }
  }

  return (
    <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Name */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-muted mb-1">Step Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onNameKey}
            placeholder="e.g. Isolate affected host"
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Step Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as StepType)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {STEP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Executor */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Executor</label>
          <select
            value={executor}
            onChange={(e) => setExecutor(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {EXECUTORS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-muted mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What does this step do?"
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        {/* Expected Outcome */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-muted mb-1">Expected Outcome</label>
          <textarea
            value={expectedOutcome}
            onChange={(e) => setExpected(e.target.value)}
            rows={2}
            placeholder="What should happen after this step succeeds?"
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>
      </div>

      {/* Render ConfigForm here if configSchema has properties */}
      {Object.keys(configSchema).length > 0 && (
        <div className="border-t border-border/50 pt-3 mt-3">
          <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
            Step Configuration
          </h4>
          <ConfigForm
            schema={configSchema}
            value={config}
            onChange={setConfig}
            allSteps={steps}
            currentStep={step}
          />
        </div>
      )}

      {/* Chip inputs */}
      <ChipInput
        label="Related CVEs"
        placeholder="CVE-2024-1234, Enter to add…"
        values={relatedCves}
        onChange={setCves}
      />
      <ChipInput
        label="Related MITRE Techniques"
        placeholder="T1046, Enter to add…"
        values={relatedMitre}
        onChange={setMitre}
      />
      <ChipInput
        label="Related IOCs"
        placeholder="192.168.1.1, badsite.com, Enter to add…"
        values={relatedIocs}
        onChange={setIocs}
      />

      {err && <p className="text-xs text-red-400">{err}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 text-xs font-semibold border border-border rounded-lg text-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={saveStep}
          className="flex-1 px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
        >
          Save Step
        </button>
      </div>
    </div>
  );
}

// ─── Step row (read mode) ─────────────────────────────────────────────────────

interface StepRowProps {
  step: PlaybookStep;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function StepRow({ step, index, total, onEdit, onDelete, onMoveUp, onMoveDown }: StepRowProps) {
  return (
    <div className="flex items-start gap-3 bg-surface-2 border border-border rounded-xl p-3 group">
      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5 mt-0.5 shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-0.5 text-muted hover:text-foreground disabled:opacity-30 transition-colors"
          title="Move up"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 1.06-1.06L7.25 11.44V2.75A.75.75 0 0 1 8 2Z" style={{ transform: "rotate(180deg)", transformOrigin: "center" }} />
          </svg>
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-0.5 text-muted hover:text-foreground disabled:opacity-30 transition-colors"
          title="Move down"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 1.06-1.06L7.25 11.44V2.75A.75.75 0 0 1 8 2Z" />
          </svg>
        </button>
      </div>

      {/* Order badge */}
      <span className="shrink-0 w-5 h-5 rounded-full bg-surface border border-border text-[10px] font-bold text-muted flex items-center justify-center mt-0.5">
        {index + 1}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${stepTypeStyle(step.type)}`}>
            {stepTypeLabel(step.type)}
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-muted bg-surface border border-border">
            Exec: {EXECUTORS.find((e) => e.value === (step.executor ?? "manual"))?.label ?? step.executor ?? "manual"}
          </span>
          <p className="text-xs font-semibold text-foreground truncate">{step.name}</p>
        </div>
        {step.description && (
          <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{step.description}</p>
        )}
        {step.expectedOutcome && (
          <p className="text-[11px] text-green-400/80 mt-0.5">→ {step.expectedOutcome}</p>
        )}
        {/* Chips */}
        <div className="flex flex-wrap gap-1 mt-1">
          {step.relatedCves?.map((c) => (
            <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">{c}</span>
          ))}
          {step.relatedMitre?.map((m) => (
            <span key={m} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{m}</span>
          ))}
          {step.relatedIocs?.map((i) => (
            <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">{i}</span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all text-xs"
          title="Edit step"
        >
          ✏
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-xs"
          title="Delete step"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ─── Mapper from Action Category/ID to StepType ───────────────────────────────

function mapActionToStepType(category: string, actionId: string): StepType {
  if (actionId === "delay") return "wait";
  if (actionId === "condition") return "condition";
  if (actionId === "manual_approval") return "manual";

  switch (category) {
    case "Network Discovery":
      return "detection";
    case "Packet Analysis":
    case "Threat Intelligence":
      return "investigation";
    case "AI":
    case "Reporting":
      return "automated";
    case "Notification":
      return "notification";
    case "Workflow":
      return "manual";
    default:
      return "manual";
  }
}

// ─── Main exported component ──────────────────────────────────────────────────

export interface PlaybookStepEditorProps {
  steps: PlaybookStep[];
  onChange: (steps: PlaybookStep[]) => void;
}

export default function PlaybookStepEditor({ steps, onChange }: PlaybookStepEditorProps) {
  // null = no form open; "new" = adding; string id = editing that step
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [addingStepAction, setAddingStepAction] = useState(false);
  const [draftStep, setDraftStep] = useState<PlaybookStep | null>(null);

  function handleAdd(saved: PlaybookStep) {
    const updated = [...steps, { ...saved, order: steps.length }];
    onChange(updated.map((s, i) => ({ ...s, order: i })));
    setEditing(null);
    setDraftStep(null);
  }

  function handleEdit(saved: PlaybookStep) {
    onChange(steps.map((s) => (s.id === saved.id ? saved : s)));
    setEditing(null);
  }

  function handleDelete(id: string) {
    const updated = steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i }));
    onChange(updated);
    if (editing === id) setEditing(null);
  }

  function handleMove(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= steps.length) return;
    const arr = [...steps];
    [arr[index], arr[next]] = [arr[next], arr[index]];
    onChange(arr.map((s, i) => ({ ...s, order: i })));
  }

  const editingStep = editing && editing !== "new" ? steps.find((s) => s.id === editing) : null;

  return (
    <div className="space-y-3">
      {addingStepAction ? (
        <ActionCatalog
          onSelect={(action) => {
            setDraftStep({
              id: crypto.randomUUID(),
              name: action.name,
              type: mapActionToStepType(action.category, action.id),
              executor: action.executor,
              description: action.description,
              expectedOutcome: "",
              relatedCves: [],
              relatedMitre: [],
              relatedIocs: [],
              order: steps.length,
            });
            setAddingStepAction(false);
            setEditing("new");
          }}
          onCancel={() => setAddingStepAction(false)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted uppercase tracking-widest">
              Steps ({steps.length})
            </p>
            <button
              type="button"
              onClick={() => setAddingStepAction(true)}
              disabled={editing !== null || addingStepAction}
              className="px-2.5 py-1 text-xs font-semibold bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
            >
              + Add Step
            </button>
          </div>

          {/* Existing steps */}
          {steps.length === 0 && editing !== "new" && (
            <div className="flex flex-col items-center justify-center py-6 border border-dashed border-border rounded-xl text-center">
              <p className="text-muted text-xs mb-1">No steps yet</p>
              <p className="text-muted text-[11px]">Click &quot;+ Add Step&quot; to start building your playbook</p>
            </div>
          )}

          <div className="space-y-2">
            {steps.map((step, i) =>
              editing === step.id ? (
                <StepForm
                  key={step.id}
                  step={editingStep ?? step}
                  steps={steps}
                  onSave={handleEdit}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <StepRow
                  key={step.id}
                  step={step}
                  index={i}
                  total={steps.length}
                  onEdit={() => setEditing(step.id)}
                  onDelete={() => handleDelete(step.id)}
                  onMoveUp={() => handleMove(i, -1)}
                  onMoveDown={() => handleMove(i, 1)}
                />
              )
            )}
          </div>

          {/* New step form */}
          {editing === "new" && (
            <StepForm
              step={draftStep || blankStep(steps.length)}
              steps={steps}
              onSave={handleAdd}
              onCancel={() => {
                setEditing(null);
                setDraftStep(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
