"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { dashboardStore } from "@/store/dashboard";
import NewProjectModal from "../NewProjectModal";

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  if (!iso) return "N/A";
  const date = new Date(iso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const severityColors = {
  CRITICAL: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", fill: "#EF4444" },
  HIGH:     { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", fill: "#F97316" },
  MEDIUM:   { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", fill: "#EAB308" },
  LOW:      { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", fill: "#3B82F6" },
  INFO:     { text: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", fill: "#64748B" },
};

export default function DashboardClient() {
  const [storeState, setStoreState] = useState(dashboardStore.getState());
  const [activeTab, setActiveTab] = useState<"timeline" | "notifications" | "activityLog">("timeline");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30000); // 30s default
  const [isAutoActive, setIsAutoActive] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState(false);


  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = dashboardStore.subscribe((state) => {
      setStoreState(state);
    });
    // Trigger initial refresh
    dashboardStore.refresh();
    return () => unsubscribe();
  }, []);

  // Handle auto-refresh interval execution
  useEffect(() => {
    if (!isAutoActive || autoRefreshInterval <= 0) return;
    const timer = setInterval(() => {
      dashboardStore.refresh();
    }, autoRefreshInterval);
    return () => clearInterval(timer);
  }, [isAutoActive, autoRefreshInterval]);

  const handleManualRefresh = useCallback(() => {
    dashboardStore.refresh();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dashboardStore.setSearchQuery(e.target.value);
  };

  const handleSort = (field: string) => {
    const currentSort = storeState.investigations.sortBy;
    const currentOrder = storeState.investigations.sortOrder;
    const newOrder = currentSort === field && currentOrder === "desc" ? "asc" : "desc";
    dashboardStore.setSorting(field, newOrder);
  };

  const { stats, activity, charts, investigations, health, loading, error } = storeState;

  // Aggregate total severity count
  const totalFindings = charts.threatSeverity.reduce((acc, c) => acc + c.count, 0);

  // Loading state skeleton helper
  const renderSkeleton = (classes: string) => (
    <div className={`bg-surface-2 animate-pulse rounded-xl ${classes}`} />
  );

  return (
    <div className="space-y-6">
      {/* ── HEADER & TOOLBAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            NetFusion Dashboard
            {loading && (
              <span className="inline-flex h-2 w-2 rounded-full bg-accent animate-ping" />
            )}
          </h1>
          <p className="text-muted text-sm mt-1">
            Real-time platform telemetry, thread modeling, and health monitoring
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Last sync indicators */}
          {storeState.refresh?.lastRefreshedAt && (
            <span className="text-xs text-muted font-mono hidden sm:inline-block">
              Sync: {new Date(storeState.refresh.lastRefreshedAt).toLocaleTimeString()}
            </span>
          )}

          {/* Auto Refresh Select */}
          <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-2.5 py-1.5">
            <span className="text-xs text-muted font-medium">Auto Sync:</span>
            <select
              value={isAutoActive ? autoRefreshInterval : 0}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val === 0) {
                  setIsAutoActive(false);
                } else {
                  setIsAutoActive(true);
                  setAutoRefreshInterval(val);
                }
              }}
              className="bg-transparent border-0 text-xs font-semibold text-foreground focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value={10000} className="bg-surface">10s</option>
              <option value={30000} className="bg-surface">30s</option>
              <option value={60000} className="bg-surface">60s</option>
              <option value={0} className="bg-surface">Disabled</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex items-center gap-2 bg-surface border border-border text-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-surface-hover hover:border-accent/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-4 h-4 text-accent ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5"
              />
            </svg>
            Refresh
          </button>

          {/* New Project Button */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-accent text-background px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors active:scale-[0.98]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
            </svg>
            New Project
          </button>
        </div>
      </div>

      {/* ── STATS GRID ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: "Projects", count: stats.projectsCount, desc: "Workspaces", color: "text-accent" },
          { label: "Investigations", count: stats.investigationsCount, desc: "Active capture nodes", color: "text-teal-400" },
          { label: "Assets", count: stats.assetsCount, desc: "Unique target IPs", color: "text-purple-400" },
          { label: "Findings", count: stats.findingsCount, desc: "Threat vulnerabilities", color: stats.findingsCount > 0 ? "text-red-400" : "text-muted" },
          { label: "Alerts", count: stats.alertsCount, desc: "IOC & heuristic triggers", color: stats.alertsCount > 0 ? "text-orange-400" : "text-muted" },
          { label: "Reports", count: stats.reportsCount, desc: "Executive briefings", color: "text-emerald-400" },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between hover:border-accent/20 transition-all hover:translate-y-[-2px] group"
          >
            <span className="text-xs text-muted font-medium">{item.label}</span>
            <div className="my-2.5">
              {loading ? (
                <div className="h-8 w-12 rounded bg-surface-2 animate-pulse" />
              ) : (
                <span className={`text-2xl font-bold tracking-tight font-mono ${item.color}`}>
                  {item.count.toLocaleString()}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted truncate">{item.desc}</span>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT: CHARTS, HEALTH, ACTIVITY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Charts & Health (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Threat Severity Chart */}
            <div className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Threat Severity Distribution</h3>
                <p className="text-xs text-muted mt-0.5">Finding counts broken down by severity level</p>
              </div>

              <div className="my-6 flex items-center justify-around">
                {loading ? (
                  <div className="w-32 h-32 rounded-full border-4 border-surface-2 border-t-accent animate-spin" />
                ) : totalFindings === 0 ? (
                  <div className="text-xs text-muted py-12">No findings recorded.</div>
                ) : (
                  <>
                    {/* SVG Donut Chart */}
                    <div className="relative w-32 h-32 shrink-0">
                      <svg width="100%" height="100%" viewBox="0 0 42 42" className="transform -rotate-90">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--surface-2)" strokeWidth="4.2" />
                        {(() => {
                          let accumulatedPercentage = 0;
                          return charts.threatSeverity
                            .filter((c) => c.count > 0)
                            .map((item, idx) => {
                              const percentage = (item.count / totalFindings) * 100;
                              const strokeDash = `${percentage} ${100 - percentage}`;
                              const strokeOffset = 100 - accumulatedPercentage;
                              accumulatedPercentage += percentage;
                              const config = severityColors[item.severity as keyof typeof severityColors] || severityColors.INFO;

                              return (
                                <circle
                                  key={idx}
                                  cx="21"
                                  cy="21"
                                  r="15.915"
                                  fill="transparent"
                                  stroke={config.fill}
                                  strokeWidth="4.5"
                                  strokeDasharray={strokeDash}
                                  strokeDashoffset={strokeOffset}
                                  className="transition-all duration-500 hover:stroke-[5.5]"
                                />
                              );
                            });
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-bold font-mono text-foreground">{totalFindings}</span>
                        <span className="text-[9px] text-muted uppercase tracking-wider">Total</span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="flex flex-col gap-1.5 text-xs text-slate-300">
                      {charts.threatSeverity.map((item) => {
                        const config = severityColors[item.severity as keyof typeof severityColors] || severityColors.INFO;
                        if (item.count === 0) return null;
                        return (
                          <div key={item.severity} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.fill }} />
                            <span className="font-semibold text-[11px] text-foreground font-mono w-6 text-right">
                              {item.count}
                            </span>
                            <span className="text-[10px] text-muted">{item.severity}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Assets/Findings Bar Chart */}
            <div className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Top Workspaces Overview</h3>
                <p className="text-xs text-muted mt-0.5">Comparative load distribution per workspace</p>
              </div>

              <div className="my-4 space-y-3.5">
                {loading ? (
                  <div className="space-y-3 py-4">
                    {renderSkeleton("h-4 w-full")}
                    {renderSkeleton("h-4 w-full")}
                    {renderSkeleton("h-4 w-full")}
                  </div>
                ) : charts.findings.length === 0 ? (
                  <div className="text-xs text-muted text-center py-12">No active workspaces.</div>
                ) : (
                  charts.findings.map((item, idx) => {
                    const assetsItem = charts.assets[idx] || { count: 0 };
                    const maxCount = Math.max(...charts.findings.map((f) => f.count), ...charts.assets.map((a) => a.count), 1);
                    const findingsPct = (item.count / maxCount) * 100;
                    const assetsPct = (assetsItem.count / maxCount) * 100;

                    return (
                      <div key={idx} className="space-y-1">
                        <span className="text-xs font-semibold text-foreground truncate block w-full">
                          {item.name}
                        </span>
                        <div className="space-y-1">
                          {/* Findings Row */}
                          <div className="flex items-center gap-2 text-[10px] text-muted">
                            <span className="w-14 truncate">Findings</span>
                            <div className="flex-1 bg-surface-2 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-red-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${findingsPct}%` }}
                              />
                            </div>
                            <span className="font-mono text-foreground font-semibold">{item.count}</span>
                          </div>
                          {/* Assets Row */}
                          <div className="flex items-center gap-2 text-[10px] text-muted">
                            <span className="w-14 truncate">Assets</span>
                            <div className="flex-1 bg-surface-2 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${assetsPct}%` }}
                              />
                            </div>
                            <span className="font-mono text-foreground font-semibold">{assetsItem.count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Health Widgets */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Services Connectivity Health</h3>
              <p className="text-xs text-muted mt-0.5">Integrations availability status indicators</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5">
              {[
                { label: "Database", key: "database", desc: "Prisma Client" },
                { label: "Backend API", key: "backend", desc: "NextJS Services" },
                { label: "Capture Agent", key: "captureAgent", desc: "Python PyShark" },
                { label: "AI Providers", key: "aiProviders", desc: "Groq / Llama" },
                { label: "Repository Server", key: "repositoryServer", desc: "Core Database" },
              ].map((serv) => {
                const status = health[serv.key as keyof typeof health] || "unknown";
                let colorClass = "bg-slate-500 border-slate-500/20";
                let textClass = "text-muted";
                let glowClass = "";

                if (status === "healthy") {
                  colorClass = "bg-success border-success/30";
                  textClass = "text-success";
                  glowClass = "shadow-[0_0_10px_rgba(34,197,94,0.4)]";
                } else if (status === "unhealthy") {
                  colorClass = "bg-danger border-danger/30 animate-pulse";
                  textClass = "text-danger animate-pulse";
                  glowClass = "shadow-[0_0_10px_rgba(239,68,68,0.4)]";
                }

                return (
                  <div
                    key={serv.key}
                    className="bg-surface-2 border border-border rounded-lg p-3 flex flex-col gap-1 items-center text-center group"
                  >
                    <span className="text-[11px] font-semibold text-slate-300">{serv.label}</span>
                    <div className="my-2.5 flex items-center justify-center">
                      {loading ? (
                        <div className="w-3 h-3 rounded-full bg-surface-hover animate-ping" />
                      ) : (
                        <span className={`w-3 h-3 rounded-full border ${colorClass} ${glowClass}`} />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${textClass}`}>
                      {loading ? "Checking" : status}
                    </span>
                    <span className="text-[9px] text-muted truncate mt-0.5">{serv.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed (4 cols) */}
        <div className="lg:col-span-4 bg-surface border border-border rounded-xl flex flex-col max-h-[464px]">
          {/* Tab selectors */}
          <div className="flex border-b border-border text-xs font-semibold shrink-0">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                activeTab === "timeline"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                activeTab === "notifications"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Alerts ({activity.notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("activityLog")}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                activeTab === "activityLog"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Audit Log
            </button>
          </div>

          {/* Tab Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
            {loading ? (
              <div className="space-y-4 py-2">
                {renderSkeleton("h-10 w-full")}
                {renderSkeleton("h-10 w-full")}
                {renderSkeleton("h-10 w-full")}
                {renderSkeleton("h-10 w-full")}
              </div>
            ) : (
              <>
                {/* TIMELINE */}
                {activeTab === "timeline" && (
                  activity.timeline.length === 0 ? (
                    <div className="text-center text-xs text-muted py-16">No timeline events reported.</div>
                  ) : (
                    activity.timeline.map((item) => (
                      <div key={item.id} className="border-l-2 border-accent/20 pl-3 py-0.5 space-y-0.5 hover:border-accent transition-colors">
                        <span className="text-[10px] text-accent font-semibold uppercase">{item.projectName}</span>
                        <p className="text-xs text-foreground font-medium leading-normal">{item.action}</p>
                        <span className="text-[10px] text-muted block font-mono">{timeAgo(item.createdAt)}</span>
                      </div>
                    ))
                  )
                )}

                {/* NOTIFICATIONS / ALERTS */}
                {activeTab === "notifications" && (
                  activity.notifications.length === 0 ? (
                    <div className="text-center text-xs text-muted py-16">No security alerts triggered.</div>
                  ) : (
                    activity.notifications.map((item) => {
                      const color = severityColors[item.severity as keyof typeof severityColors] || severityColors.INFO;
                      return (
                        <div key={item.id} className={`border border-border rounded-lg p-3 hover:border-accent/10 transition-colors ${color.bg}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted uppercase font-semibold">{item.projectName}</span>
                            <span className={`inline-flex px-1.5 py-0.5 text-[9px] rounded font-semibold border ${color.text} ${color.border}`}>
                              {item.severity}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-foreground mt-1.5 leading-snug">{item.title}</h4>
                          {item.message && <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{item.message}</p>}
                          <span className="text-[9px] text-muted block font-mono mt-2">{timeAgo(item.createdAt)}</span>
                        </div>
                      );
                    })
                  )
                )}

                {/* AUDIT LOG */}
                {activeTab === "activityLog" && (
                  activity.activityLog.length === 0 ? (
                    <div className="text-center text-xs text-muted py-16">Audit log is currently empty.</div>
                  ) : (
                    activity.activityLog.map((item) => (
                      <div key={item.id} className="text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-foreground leading-normal font-medium">{item.action}</p>
                          <span className="text-[10px] text-muted block mt-1">
                            By <strong className="text-slate-300">{item.user}</strong> in {item.projectName}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted font-mono shrink-0 whitespace-nowrap">{timeAgo(item.createdAt)}</span>
                      </div>
                    ))
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── RECENT INVESTIGATIONS (PROJECTS TABLE) ── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recent Investigations</h3>
            <p className="text-xs text-muted mt-0.5">Browse, search, and sort active security workspaces</p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm w-full">
            <input
              type="text"
              placeholder="Search workspaces by name..."
              value={investigations.searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-surface-2 border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
            />
            <svg
              className="absolute left-3 top-2.5 w-4 h-4 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-3.5 py-6">
              {renderSkeleton("h-12 w-full")}
              {renderSkeleton("h-12 w-full")}
              {renderSkeleton("h-12 w-full")}
            </div>
          ) : error ? (
            <div className="border border-danger/20 bg-danger-dim rounded-lg p-5 text-center my-6">
              <p className="text-sm text-danger font-semibold">Failed to load investigations</p>
              <p className="text-xs text-muted mt-1 leading-normal">
                {error.message || String(error)}
              </p>
              <button
                onClick={handleManualRefresh}
                className="mt-3 inline-flex items-center gap-2 bg-danger text-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-danger/80 transition-colors"
              >
                Retry Request
              </button>
            </div>
          ) : investigations.data.length === 0 ? (
            <div className="text-center py-16">
              <svg
                className="mx-auto h-8 w-8 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-xs font-semibold text-foreground">No investigations found</h3>
              <p className="mt-1 text-xs text-muted">
                {investigations.searchQuery
                  ? "Try adjusting your search query filter keywords."
                  : "Get started by creating your first project workspace above."}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-muted font-medium uppercase tracking-wider text-[10px]">
                  <th
                    onClick={() => handleSort("name")}
                    className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                  >
                    Workspace {investigations.sortBy === "name" && (investigations.sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    onClick={() => handleSort("assetsCount")}
                    className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors text-right"
                  >
                    Assets {investigations.sortBy === "assetsCount" && (investigations.sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    onClick={() => handleSort("findingsCount")}
                    className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors text-right"
                  >
                    Findings {investigations.sortBy === "findingsCount" && (investigations.sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    onClick={() => handleSort("alertsCount")}
                    className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors text-right"
                  >
                    Alerts {investigations.sortBy === "alertsCount" && (investigations.sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    onClick={() => handleSort("updatedAt")}
                    className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors text-right"
                  >
                    Last Activity {investigations.sortBy === "updatedAt" && (investigations.sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {investigations.data.map((proj) => {
                  const assetsCount = proj._count?.assets ?? 0;
                  const findingsCount = proj._count?.findings ?? 0;
                  
                  // Count finding severities for badges
                  const severityCounts: Record<string, number> = {};
                  if (Array.isArray(proj.findings)) {
                    proj.findings.forEach((f: any) => {
                      const sev = String(f.severity).toUpperCase();
                      severityCounts[sev] = (severityCounts[sev] || 0) + 1;
                    });
                  }

                  // Alerts count
                  let alertsCount = 0;
                  if (proj.captureSession) {
                    if (Array.isArray(proj.captureSession.alerts)) {
                      alertsCount = proj.captureSession.alerts.length;
                    }
                  }

                  return (
                    <tr
                      key={proj.id}
                      className="hover:bg-surface-2/30 transition-colors border-b border-border/10 last:border-0"
                    >
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-foreground truncate">{proj.name}</div>
                        {proj.description && (
                          <div className="text-[10px] text-muted truncate mt-0.5">{proj.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-300 font-mono">
                        {assetsCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="flex items-center justify-end gap-1.5">
                          {findingsCount === 0 ? (
                            <span className="text-muted font-semibold">0</span>
                          ) : (
                            <>
                              {severityCounts.CRITICAL && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
                                  C {severityCounts.CRITICAL}
                                </span>
                              )}
                              {severityCounts.HIGH && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                  H {severityCounts.HIGH}
                                </span>
                              )}
                              {severityCounts.MEDIUM && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                                  M {severityCounts.MEDIUM}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {alertsCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded font-semibold text-[10px] bg-orange-500/10 border border-orange-500/20 text-orange-400">
                            {alertsCount}
                          </span>
                        ) : (
                          <span className="text-muted font-semibold">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted">
                        {timeAgo(proj.updatedAt)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/dashboard/projects/${proj.id}`}
                          className="inline-flex items-center justify-center bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-background font-semibold px-3 py-1 rounded transition-all active:scale-[0.98]"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && !error && investigations.total > 0 && (
          <div className="flex items-center justify-between border-t border-border/80 pt-4 mt-4 text-xs">
            <span className="text-muted">
              Showing{" "}
              <strong className="text-foreground font-semibold">
                {Math.min(investigations.total, (investigations.page - 1) * investigations.limit + 1)}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground font-semibold">
                {Math.min(investigations.total, investigations.page * investigations.limit)}
              </strong>{" "}
              of <strong className="text-foreground font-semibold">{investigations.total}</strong> results
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => dashboardStore.setPage(investigations.page - 1)}
                disabled={investigations.page === 1}
                className="px-2.5 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>

              <span className="text-muted font-mono font-semibold px-2">
                Page {investigations.page} of {Math.max(1, Math.ceil(investigations.total / investigations.limit))}
              </span>

              <button
                onClick={() => dashboardStore.setPage(investigations.page + 1)}
                disabled={investigations.page >= Math.ceil(investigations.total / investigations.limit)}
                className="px-2.5 py-1.5 border border-border rounded-lg bg-surface hover:bg-surface-hover text-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
