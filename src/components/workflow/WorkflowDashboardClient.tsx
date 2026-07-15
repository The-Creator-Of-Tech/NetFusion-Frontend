"use client";

import { useEffect } from "react";
import { workflowStore } from "@/store/workflow";
import Link from "next/link";

interface Props { projectId: string }

const StatCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) => (
  <div className="bg-surface border border-border rounded-xl p-4">
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted/50 mb-2">{label}</p>
    <p className={`text-2xl font-bold ${color ?? "text-foreground"}`}>{value}</p>
    {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
  </div>
);

export default function WorkflowDashboardClient({ projectId }: Props) {
  const state = workflowStore.useStore();

  useEffect(() => { workflowStore.refresh(projectId); }, [projectId]);

  const stats = state.statistics;
  const loadingAny = Object.values(state.loading).some(Boolean);
  const base = `/dashboard/projects/${projectId}/workflow`;

  const modules = [
    { label: "Playbooks", href: `${base}/playbooks`, desc: "Create and manage response playbooks", count: state.playbooks.length, icon: "📋" },
    { label: "Rules", href: `${base}/rules`, desc: "Automated detection and action rules", count: state.rules.length, icon: "⚡" },
    { label: "Automation", href: `${base}/automation`, desc: "Track automation runs and schedules", count: state.automations.length, icon: "🤖" },
    { label: "Case Flow", href: `${base}/cases`, desc: "Manage investigation cases end-to-end", count: state.cases.length, icon: "📁" },
    { label: "Execution Monitor", href: `${base}/executions`, desc: "Live view of all running executions", count: state.executions.length, icon: "📊" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Workflow Center</h1>
          <p className="text-muted text-xs mt-0.5">Automate, orchestrate and track your security operations</p>
        </div>
        <button
          onClick={() => workflowStore.refresh(projectId)}
          disabled={loadingAny}
          className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-xs text-muted hover:text-foreground hover:bg-surface-2 transition-all disabled:opacity-50"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={loadingAny ? "animate-spin" : ""}>
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Playbooks" value={stats?.totalPlaybooks ?? 0} />
        <StatCard label="Active Automations" value={stats?.activeAutomations ?? 0} color="text-accent" />
        <StatCard label="Running Executions" value={stats?.runningExecutions ?? 0} color="text-yellow-400" />
        <StatCard label="Open Cases" value={stats?.openCases ?? 0} color="text-orange-400" />
        <StatCard label="Completed Cases" value={stats?.completedCases ?? 0} color="text-green-400" />
        <StatCard label="Rule Count" value={stats?.ruleCount ?? 0} />
        <StatCard label="Success Rate" value={`${stats?.successRate ?? 0}%`} color="text-green-400" />
        <StatCard label="Failed Executions" value={stats?.failedExecutions ?? 0} color="text-red-400" />
      </div>

      {/* Module cards */}
      <div>
        <p className="text-xs font-bold text-muted/50 uppercase tracking-widest mb-3">Modules</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((m) => (
            <Link key={m.label} href={m.href} className="group bg-surface border border-border rounded-xl p-4 hover:bg-surface-2 hover:border-accent/30 transition-all">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xl">{m.icon}</span>
                <span className="text-xs text-muted bg-surface-2 border border-border rounded-full px-2 py-0.5 font-mono">{m.count}</span>
              </div>
              <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{m.label}</p>
              <p className="text-xs text-muted mt-0.5">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
