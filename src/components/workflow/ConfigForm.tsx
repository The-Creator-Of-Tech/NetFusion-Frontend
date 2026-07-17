"use client";

import React, { useState, useEffect, useMemo } from "react";
import { inferVariablesFromSteps, WorkflowVariable } from "@/lib/workflowVariables";
import VariablePicker from "./VariablePicker";
import type { PlaybookStep } from "@/types/api";

export interface SchemaField {
  type: "text" | "textarea" | "number" | "boolean" | "select" | "multiselect" | "tags" | "json" | "password";
  label?: string;
  placeholder?: string;
  default?: any;
  required?: boolean;
  options?: { value: string; label: string }[];
  source?: string;
  description?: string;
}

export type ConfigSchema = Record<string, SchemaField>;

interface ConfigFormProps {
  schema: ConfigSchema;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  allSteps?: PlaybookStep[];
  currentStep?: PlaybookStep;
}

export default function ConfigForm({ schema, value, onChange, allSteps, currentStep }: ConfigFormProps) {
  const [interfaces, setInterfaces] = useState<{ value: string; label: string }[]>([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  const [activePicker, setActivePicker] = useState<string | null>(null);

  // Infer available variables from previous steps
  const availableVariables = useMemo(() => {
    if (!allSteps || !currentStep) return [];
    return inferVariablesFromSteps(allSteps, currentStep.order);
  }, [allSteps, currentStep]);

  const availableVariableNames = useMemo(() => {
    return new Set(availableVariables.map((v) => v.name));
  }, [availableVariables]);

  const findUnresolvedVariables = (val: any, availableNames: Set<string>): string[] => {
    if (val === undefined || val === null) return [];
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    const regex = /\${([^}]+)}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      const varName = match[1].trim();
      if (!availableNames.has(varName)) {
        matches.push(varName);
      }
    }
    return Array.from(new Set(matches));
  };

  const handleInsertVariable = (key: string, varName: string, fieldType: string) => {
    if (fieldType === "json") {
      const rawVal = jsonDrafts[key] !== undefined 
        ? jsonDrafts[key] 
        : (typeof value[key] === "object" ? JSON.stringify(value[key], null, 2) : String(value[key] !== undefined ? value[key] : ""));
      const newVal = `${rawVal}\${${varName}}`;
      setJsonDrafts((prev) => ({ ...prev, [key]: newVal }));
      try {
        if (!newVal.trim()) {
          handleFieldChange(key, null);
        } else {
          // If it contains a variable placeholder, JSON.parse might fail, but we update config raw value anyway.
          const parsed = JSON.parse(newVal);
          handleFieldChange(key, parsed);
        }
        setJsonErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } catch (e: any) {
        handleFieldChange(key, newVal);
        if (newVal.includes("${")) {
          setJsonErrors((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        } else {
          setJsonErrors((prev) => ({
            ...prev,
            [key]: e.message || "Invalid JSON format",
          }));
        }
      }
    } else {
      const currentValue = value[key] !== undefined ? value[key] : "";
      const stringVal = currentValue === undefined || currentValue === null ? "" : String(currentValue);
      const newVal = `${stringVal}\${${varName}}`;
      handleFieldChange(key, newVal);
    }
  };

  const wrapWithVariablePicker = (key: string, type: string, currentValue: any, inputJSX: React.ReactElement) => {
    const unresolved = findUnresolvedVariables(currentValue, availableVariableNames);
    const hasUnresolved = unresolved.length > 0;

    let styledInput = inputJSX;
    if (React.isValidElement(inputJSX)) {
      const existingClassName = (inputJSX.props as any).className || "";
      let newClassName = existingClassName;
      if (hasUnresolved) {
        newClassName = newClassName
          .replace("border-border", "border-yellow-500/60")
          .replace("focus:ring-accent", "focus:ring-yellow-500");
      }
      if (!newClassName.includes("pr-")) {
        newClassName += " pr-9";
      } else {
        newClassName = newClassName.replace(/pr-\d+/, "pr-9");
      }
      styledInput = React.cloneElement(inputJSX, {
        className: newClassName,
      } as any);
    }

    const isMultiline = type === "textarea" || type === "json";

    return (
      <div className="space-y-1 w-full">
        <div className="relative w-full flex items-stretch">
          {styledInput}
          <button
            type="button"
            onClick={() => setActivePicker(activePicker === key ? null : key)}
            className={`absolute right-2.5 z-10 text-muted hover:text-accent font-bold text-[10px] bg-surface-2/80 hover:bg-surface-3 border border-border/40 px-1 py-0.5 rounded transition-all select-none hover:scale-105 active:scale-95 ${
              isMultiline ? "top-2.5" : "top-1/2 -translate-y-1/2"
            }`}
            title="Insert Variable Reference"
          >
            {"{x}"}
          </button>
          {activePicker === key && (
            <div className={`absolute z-50 right-0 ${isMultiline ? "top-9" : "top-full mt-1"}`}>
              <VariablePicker
                variables={availableVariables}
                onSelect={(varName) => handleInsertVariable(key, varName, type)}
                onClose={() => setActivePicker(null)}
              />
            </div>
          )}
        </div>
        {unresolved.map((uv) => (
          <p key={uv} className="text-[10px] text-yellow-500 font-semibold flex items-center gap-1 animate-pulse">
            ⚠️ Unresolved variable reference: {`\${${uv}}`}
          </p>
        ))}
      </div>
    );
  };

  // Fetch dynamic interfaces if schema contains capture_interfaces source
  useEffect(() => {
    const hasInterfacesSource = Object.values(schema).some(
      (field) => field.source === "capture_interfaces"
    );

    if (hasInterfacesSource) {
      setLoadingInterfaces(true);
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || "http://127.0.0.1:8000";
      fetch(`${agentUrl}/capture/interfaces`)
        .then((res) => {
          if (!res.ok) throw new Error("Agent interfaces request failed");
          return res.json();
        })
        .then((data) => {
          const ifaces = data.interfaces || [];
          setInterfaces(ifaces.map((i: any) => ({ value: i.value, label: i.label })));
        })
        .catch((err) => {
          console.error("ConfigForm: Failed to fetch interfaces, using fallbacks:", err);
          setInterfaces([
            { value: "\\Device\\NPF_{55969DAD-01B7-45E2-B14A-9E299B234297}", label: "Wi-Fi" },
            { value: "\\Device\\NPF_{5D70C35B-1674-456B-A290-2A86442D2D4E}", label: "Ethernet" },
            { value: "\\Device\\NPF_Loopback", label: "Loopback" },
          ]);
        })
        .finally(() => {
          setLoadingInterfaces(false);
        });
    }
  }, [schema]);

  const handleFieldChange = (key: string, val: any) => {
    onChange({
      ...value,
      [key]: val,
    });
  };

  const getOptions = (field: SchemaField) => {
    if (field.source === "capture_interfaces") {
      return interfaces;
    }
    return field.options || [];
  };

  // Render individual field inputs
  const renderField = (key: string, field: SchemaField) => {
    const currentValue = value[key] !== undefined ? value[key] : (field.default !== undefined ? field.default : "");

    switch (field.type) {
      case "text":
        return wrapWithVariablePicker(
          key,
          "text",
          currentValue,
          <input
            type="text"
            value={currentValue}
            placeholder={field.placeholder}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        );

      case "password":
        return wrapWithVariablePicker(
          key,
          "password",
          currentValue,
          <input
            type="password"
            value={currentValue}
            placeholder={field.placeholder}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        );

      case "textarea":
        return wrapWithVariablePicker(
          key,
          "textarea",
          currentValue,
          <textarea
            value={currentValue}
            placeholder={field.placeholder}
            rows={3}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        );

      case "number": {
        const isVariable = typeof currentValue === "string" && currentValue.includes("${");
        return wrapWithVariablePicker(
          key,
          "number",
          currentValue,
          <input
            type={isVariable ? "text" : "number"}
            value={currentValue}
            placeholder={field.placeholder}
            onChange={(e) => {
              const val = e.target.value;
              const isVar = val.includes("${");
              const num = val === "" ? "" : (isVar ? val : Number(val));
              handleFieldChange(key, num);
            }}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        );
      }

      case "boolean":
        return (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id={`config-bool-${key}`}
              checked={!!currentValue}
              onChange={(e) => handleFieldChange(key, e.target.checked)}
              className="w-4 h-4 rounded border-border bg-surface text-accent focus:ring-accent accent-accent"
            />
            <label htmlFor={`config-bool-${key}`} className="text-xs text-muted cursor-pointer select-none">
              {field.placeholder || "Enable"}
            </label>
          </div>
        );

      case "select": {
        const opts = getOptions(field);
        return (
          <div className="relative">
            <select
              value={currentValue}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent appearance-none"
            >
              <option value="" disabled>Select option...</option>
              {opts.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {loadingInterfaces && field.source === "capture_interfaces" && (
              <span className="absolute right-8 top-2 text-[10px] text-muted animate-pulse">Loading...</span>
            )}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
              <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        );
      }

      case "multiselect": {
        const opts = getOptions(field);
        const selectedArr = Array.isArray(currentValue) ? currentValue : [];
        const toggleOption = (optVal: string) => {
          if (selectedArr.includes(optVal)) {
            handleFieldChange(key, selectedArr.filter((x) => x !== optVal));
          } else {
            handleFieldChange(key, [...selectedArr, optVal]);
          }
        };

        return (
          <div className="space-y-1 bg-surface border border-border rounded-lg p-2 max-h-[150px] overflow-y-auto">
            {opts.length === 0 ? (
              <p className="text-[10px] text-muted p-1">No options available</p>
            ) : (
              opts.map((opt) => {
                const isChecked = selectedArr.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className="flex items-center gap-2 p-1 hover:bg-surface-2 rounded cursor-pointer select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent accent-accent pointer-events-none"
                    />
                    <span className="text-[11px] text-foreground">{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>
        );
      }

      case "tags": {
        const tagArr = Array.isArray(currentValue) ? currentValue : [];
        const [draftTag, setDraftTag] = useState("");

        const commitTag = () => {
          const t = draftTag.trim();
          if (t && !tagArr.includes(t)) {
            handleFieldChange(key, [...tagArr, t]);
          }
          setDraftTag("");
        };

        return (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1 bg-surface border border-border rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-accent">
              {tagArr.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleFieldChange(key, tagArr.filter((t) => t !== tag))}
                    className="text-muted hover:text-red-400 transition-colors leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={draftTag}
                onChange={(e) => setDraftTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    commitTag();
                  }
                }}
                onBlur={commitTag}
                placeholder={tagArr.length === 0 ? (field.placeholder || "Enter tags...") : ""}
                className="flex-1 min-w-[60px] bg-transparent text-xs text-foreground placeholder:text-muted outline-none"
              />
            </div>
            <p className="text-[9px] text-muted">Press Enter or comma to add tag</p>
          </div>
        );
      }

      case "json": {
        const stringifiedVal = jsonDrafts[key] !== undefined 
          ? jsonDrafts[key] 
          : (typeof currentValue === "object" ? JSON.stringify(currentValue, null, 2) : String(currentValue));

        const handleJsonChange = (raw: string) => {
          setJsonDrafts((prev) => ({ ...prev, [key]: raw }));
          try {
            if (!raw.trim()) {
              handleFieldChange(key, null);
              setJsonErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
              });
              return;
            }
            const parsed = JSON.parse(raw);
            handleFieldChange(key, parsed);
            setJsonErrors((prev) => {
              const next = { ...prev };
              delete next[key];
              return next;
            });
          } catch (e: any) {
            handleFieldChange(key, raw);
            if (raw.includes("${")) {
              setJsonErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
              });
            } else {
              setJsonErrors((prev) => ({
                ...prev,
                [key]: e.message || "Invalid JSON format",
              }));
            }
          }
        };

        const jsonInputJSX = (
          <textarea
            value={stringifiedVal}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder='{ "key": "value" }'
            rows={4}
            className={`w-full font-mono bg-surface border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 resize-none ${
              jsonErrors[key] ? "border-red-500/50 focus:ring-red-500" : "border-border focus:ring-accent"
            }`}
          />
        );

        return (
          <div className="space-y-1">
            {wrapWithVariablePicker(key, "json", stringifiedVal, jsonInputJSX)}
            {jsonErrors[key] && (
              <p className="text-[10px] text-red-400 font-semibold">{jsonErrors[key]}</p>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(schema).map(([key, field]) => (
        <div key={key} className="space-y-1">
          <div className="flex items-baseline justify-between">
            <label className="block text-xs font-semibold text-foreground">
              {field.label || key.replace(/_/g, " ")}
              {field.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
          </div>
          {field.description && (
            <p className="text-[10px] text-muted leading-snug">{field.description}</p>
          )}
          <div className="mt-1">{renderField(key, field)}</div>
        </div>
      ))}
    </div>
  );
}
