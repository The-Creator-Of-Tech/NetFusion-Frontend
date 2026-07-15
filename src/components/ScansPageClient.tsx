"use client";

import { useState } from "react";
import ScanPanel from "./ScanPanel";
import ScanHistory, { ScanRow } from "./ScanHistory";

interface Props {
  projectId: string;
  initialScans: ScanRow[];
}

export default function ScansPageClient({ projectId, initialScans }: Props) {
  // Lifted state — ScanPanel pushes new scans up, ScanHistory reads them
  const [scans, setScans] = useState<ScanRow[]>(initialScans);

  function handleScanSaved(scan: ScanRow) {
    setScans((prev) => [scan, ...prev]);
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-foreground">Network Scans</h1>
        <p className="text-muted text-xs mt-0.5">
          Run port scans against targets and track results over time
        </p>
      </div>

      {/* Run scan panel */}
      <ScanPanel
        projectId={projectId}
        onScanSaved={handleScanSaved}
      />

      {/* Scan history */}
      <ScanHistory
        projectId={projectId}
        initialScans={scans}
      />
    </div>
  );
}
