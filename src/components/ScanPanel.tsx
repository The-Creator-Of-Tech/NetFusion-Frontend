"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Port {
  port: number;
  state: string;
  service: string;
}

interface ScanResult {
  target: string;
  profile: string;
  ports: Port[];
}

interface Props {
  projectId: string;
  onScanSaved?: (scan: { id: string; target: string; results: ScanResult; createdAt: string }) => void;
}

export default function ScanPanel({ projectId, onScanSaved }: Props) {
  const searchParams = useSearchParams();
  const [target,   setTarget]   = useState("");
  const [profile,  setProfile]  = useState("quick");

  useEffect(() => {
    const t = searchParams.get("target");
    const p = searchParams.get("profile");
    if (t) setTarget(t);
    if (p) setProfile(p);
  }, [searchParams]);

  const [result,   setResult]   = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [saved,    setSaved]    = useState(false);

  async function runScan() {
    if (!target.trim()) { setError("Enter a target first"); return; }
    setError("");
    setResult(null);
    setSaved(false);
    setScanning(true);

    try {
      // ── 1. Call the Python scan agent ──────────────────────────────────────
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
      if (!agentUrl) {
        setError("NEXT_PUBLIC_AGENT_URL is not set — scan agent is unavailable.");
        setScanning(false);
        return;
      }

      const scanRes = await fetch(`${agentUrl}/scan`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ target: target.trim(), profile }),
      });

      console.log("Scan agent status:", scanRes.status);

      if (!scanRes.ok) {
        const errData = await scanRes.json().catch(() => ({}));
        setError(`Scan failed: ${errData.detail ?? errData.error ?? scanRes.statusText}`);
        setScanning(false);
        return;
      }

      const data: ScanResult = await scanRes.json();
      console.log("Scan result:", data);
      setResult(data);
      setScanning(false);

      // ── 2. Save to database ────────────────────────────────────────────────
      setSaving(true);
      const saveRes = await fetch(`/api/projects/${projectId}/scans`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ target: target.trim(), results: data }),
      });

      console.log("SAVE STATUS:", saveRes.status);
      const saveData = await saveRes.json();
      console.log("Save response:", saveData);

      if (!saveRes.ok) {
        setError(`Saved locally but DB write failed (${saveRes.status}): ${saveData.error ?? "unknown error"}`);
      } else {
        setSaved(true);
        // Notify parent so history list updates without page refresh
        if (onScanSaved && saveData.scan) {
          onScanSaved(saveData.scan);
        }
      }
    } catch (err) {
      console.error("runScan error:", err);
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      setScanning(false);
    } finally {
      setSaving(false);
    }
  }

  const openPorts  = result?.ports.filter((p) => p.state === "open") ?? [];
  const closedCount = (result?.ports.length ?? 0) - openPorts.length;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-accent">
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z" />
        </svg>
        <h2 className="font-semibold text-foreground">Network Scan</h2>
      </div>

      {/* Input row */}
      <div className="flex gap-2 mb-3">
        <input
          value={target}
          onChange={(e) => { setTarget(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") runScan(); }}
          placeholder="scanme.nmap.org or 192.168.1.1"
          disabled={scanning || saving}
          className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors disabled:opacity-50"
        />
      </div>

      {/* Profile selector + Run button */}
      <div className="flex gap-2">
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          disabled={scanning || saving}
          className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors disabled:opacity-50"
        >
          <option value="quick">Quick Scan</option>
          <option value="full">Full Port Scan</option>
          <option value="service">Service Detection</option>
          <option value="os">OS Detection</option>
          <option value="aggressive">Aggressive Scan</option>
        </select>

        <button
          onClick={runScan}
          disabled={scanning || saving || !target.trim()}
          className="flex items-center gap-1.5 bg-accent text-background px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {scanning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
              Scanning…
            </>
          ) : saving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z" />
              </svg>
              Run Scan
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-3 text-danger text-xs bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Saved confirmation */}
      {saved && !error && (
        <p className="mt-3 text-success text-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          Scan saved to project
        </p>
      )}

      {/* Results */}
      {result && (
        <div className="mt-5">
          {/* Summary */}
          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-xs text-muted">Target</p>
              <p className="text-sm font-semibold text-foreground font-mono">{result.target}</p>
            </div>
            {result.profile && (
              <div>
                <p className="text-xs text-muted">Profile</p>
                <p className="text-sm font-semibold text-foreground capitalize">{result.profile}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted">Open ports</p>
              <p className="text-sm font-semibold text-success">{openPorts.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Closed / filtered</p>
              <p className="text-sm font-semibold text-muted">{closedCount}</p>
            </div>
          </div>

          {/* Port table */}
          {openPorts.length === 0 ? (
            <p className="text-muted text-sm">No open ports found.</p>
          ) : (
            <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Port</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">State</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Service</th>
                  </tr>
                </thead>
                <tbody>
                  {openPorts.map((port) => (
                    <tr key={port.port} className="border-b border-border last:border-0 hover:bg-surface transition-colors">
                      <td className="px-4 py-2.5 font-mono text-foreground text-xs">{port.port}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-semibold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded">
                          {port.state}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted text-xs">{port.service || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
