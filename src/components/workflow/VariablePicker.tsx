"use client";

import React, { useState, useMemo } from "react";
import { WorkflowVariable } from "@/lib/workflowVariables";

interface VariablePickerProps {
  variables: WorkflowVariable[];
  onSelect: (name: string) => void;
  onClose: () => void;
}

function getVariableIcon(name: string, type: string): string {
  const n = name.toLowerCase();
  if (n.includes("capture_file") || n.includes("path") || type === "file") return "📄";
  if (n.includes("duration") || n.includes("timeout")) return "⏱";
  if (n.includes("packet_count") || type === "number") {
    if (n.includes("risk_score")) return "⚠";
    return "🔢";
  }
  if (
    n.includes("dns_queries") ||
    n.includes("http_hosts") ||
    n.includes("services") ||
    n.includes("ports") ||
    n.includes("conversations")
  ) {
    return "🌐";
  }
  if (n.includes("protocols") || n.includes("techniques")) return "📊";
  if (n.includes("summary")) return "🧠";
  if (n.includes("confirmed") || type === "boolean") return "✅";
  return "📦";
}

function getPreviewText(variable: WorkflowVariable): string {
  const val = variable.value;
  if (variable.type === "array") {
    if (Array.isArray(val)) {
      return `${val.length} value${val.length !== 1 ? "s" : ""}`;
    }
    return "array";
  }
  if (variable.type === "object") {
    if (val && typeof val === "object") {
      return `${Object.keys(val).length} fields`;
    }
    return "object";
  }
  return String(val);
}

export default function VariablePicker({ variables, onSelect, onClose }: VariablePickerProps) {
  const [search, setSearch] = useState("");

  // Group variables by their creator step
  const filteredAndGrouped = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    const filtered = variables.filter((v) => {
      if (!searchLower) return true;
      return (
        v.name.toLowerCase().includes(searchLower) ||
        v.createdBy.toLowerCase().includes(searchLower) ||
        v.type.toLowerCase().includes(searchLower)
      );
    });

    // Grouping structure: { [createdBy]: { stepNumber, variables: [] } }
    const groups: Record<string, { stepNumber: number; vars: WorkflowVariable[] }> = {};

    filtered.forEach((v) => {
      const groupKey = v.createdBy;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          stepNumber: v.stepNumber,
          vars: [],
        };
      }
      groups[groupKey].vars.push(v);
    });

    // Sort group names by stepNumber
    return Object.entries(groups).sort((a, b) => a[1].stepNumber - b[1].stepNumber);
  }, [variables, search]);

  return (
    <>
      {/* Click outside to close overlay */}
      <div className="fixed inset-0 z-40 cursor-default" onClick={onClose} />

      {/* Picker container */}
      <div
        className="absolute z-50 mt-1 w-72 max-h-80 overflow-y-auto bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-2xl flex flex-col p-2 text-foreground select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="relative shrink-0 mb-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search variables..."
            className="w-full bg-surface-2 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            autoFocus
          />
          <div className="absolute left-2.5 top-2 text-muted">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-2 text-muted hover:text-foreground text-[10px]"
            >
              ×
            </button>
          )}
        </div>

        {/* Grouped variables list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
          {filteredAndGrouped.length === 0 ? (
            <p className="text-[10px] text-muted text-center py-4 italic">
              {variables.length === 0
                ? "No variables available from prior steps."
                : "No matching variables found."}
            </p>
          ) : (
            filteredAndGrouped.map(([stepName, group]) => (
              <div key={stepName} className="space-y-1">
                {/* Group Header */}
                <div className="flex items-center justify-between border-b border-border/40 pb-0.5 px-1">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider">
                    {stepName}
                  </span>
                  <span className="text-[8px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full font-mono font-semibold">
                    Step {group.stepNumber}
                  </span>
                </div>

                {/* Group Variables */}
                <div className="space-y-0.5">
                  {group.vars.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => {
                        onSelect(v.name);
                        onClose();
                      }}
                      className="w-full text-left flex items-center justify-between p-1.5 hover:bg-surface-2 rounded-lg cursor-pointer transition-colors group"
                      title={`${v.name} (${v.type})\n${getPreviewText(v)}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs shrink-0 bg-surface-3 w-5 h-5 flex items-center justify-center rounded-md border border-border/20 shadow-sm transition-transform group-hover:scale-105">
                          {getVariableIcon(v.name, v.type)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold font-mono text-foreground truncate group-hover:text-accent transition-colors">
                            {v.name}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] text-muted truncate max-w-[120px] pl-2 font-mono">
                        → {getPreviewText(v)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
