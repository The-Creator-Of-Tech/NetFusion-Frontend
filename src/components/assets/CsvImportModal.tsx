"use client";

import { useRef, useState } from "react";

interface CsvRow {
  ip: string;
  hostname: string;
  type: string;
  tags: string;
}

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const ipIdx = headers.indexOf("ip");
  const hostnameIdx = headers.indexOf("hostname");
  const typeIdx = headers.indexOf("type");
  const tagsIdx = headers.indexOf("tags");

  return lines.slice(1).map((line) => {
    // Handle quoted fields
    const cols: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());

    return {
      ip: ipIdx >= 0 ? (cols[ipIdx] ?? "") : "",
      hostname: hostnameIdx >= 0 ? (cols[hostnameIdx] ?? "") : "",
      type: typeIdx >= 0 ? (cols[typeIdx] ?? "Other") : "Other",
      tags: tagsIdx >= 0 ? (cols[tagsIdx] ?? "") : "",
    };
  }).filter((r) => r.ip || r.hostname || r.type);
}

export default function CsvImportModal({ projectId, open, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");

  function reset() {
    setRows([]); setFileName(""); setError(""); setStep("upload");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() { reset(); onClose(); }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setError("No valid rows found. Make sure the CSV has headers: ip, hostname, type, tags");
        return;
      }
      if (parsed.length > 500) {
        setError("Maximum 500 rows per import.");
        return;
      }
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/projects/${projectId}/assets/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || "Import failed"); return; }
    onImported(data.imported);
    handleClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">Import Assets from CSV</h2>
            <p className="text-xs text-muted mt-0.5">
              Required columns: <code className="text-accent">ip</code>,{" "}
              <code className="text-accent">hostname</code>,{" "}
              <code className="text-accent">type</code>,{" "}
              <code className="text-accent">tags</code>
            </p>
          </div>
          <button onClick={handleClose} className="text-muted hover:text-foreground transition-colors p-1 rounded">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "upload" ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:border-accent/50 transition-colors group">
              <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" className="text-muted group-hover:text-accent transition-colors mb-3">
                <path d="M8.75 1.75a.75.75 0 0 0-1.5 0V7H3.75a.75.75 0 0 0 0 1.5H7.25v5.25a.75.75 0 0 0 1.5 0V8.5h3.5a.75.75 0 0 0 0-1.5H8.75V1.75Z" />
              </svg>
              <p className="text-sm text-foreground font-medium">Click to upload CSV</p>
              <p className="text-xs text-muted mt-1">or drag and drop</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-foreground">
                  <span className="font-semibold text-accent">{rows.length}</span> rows from{" "}
                  <span className="text-muted">{fileName}</span>
                </p>
                <button
                  onClick={reset}
                  className="text-xs text-muted hover:text-foreground transition-colors"
                >
                  Change file
                </button>
              </div>

              {/* Preview table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-2 border-b border-border">
                      {["IP", "Hostname", "Type", "Tags"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-muted font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                        <td className="px-3 py-2 text-foreground font-mono">{row.ip || "—"}</td>
                        <td className="px-3 py-2 text-foreground">{row.hostname || "—"}</td>
                        <td className="px-3 py-2 text-foreground">{row.type || "Other"}</td>
                        <td className="px-3 py-2 text-muted">{row.tags || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 10 && (
                  <p className="text-xs text-muted px-3 py-2 bg-surface-2 border-t border-border">
                    + {rows.length - 10} more rows not shown
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 text-danger text-sm bg-danger-dim border border-danger/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 border border-border text-foreground py-2 rounded-lg text-sm font-medium hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          {step === "preview" && (
            <button
              onClick={handleImport}
              disabled={loading || rows.length === 0}
              className="flex-1 bg-accent text-background py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Importing..." : `Import ${rows.length} Asset${rows.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
