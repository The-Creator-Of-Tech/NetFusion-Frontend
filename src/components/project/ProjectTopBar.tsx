"use client";

import Link from "next/link";
import { useState } from "react";
import ProjectSearch from "./ProjectSearch";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface Stats {
  riskScore: number;
  riskLevel: string;
  assetsCount: number;
  findingsCount: number;
  criticalFindingsCount: number;
  alertsCount: number;
  lastActivity: string;
}

interface Props {
  projectId: string;
  projectName: string;
  members: Member[];
  currentUserId: string;
  stats: Stats;
}

export default function ProjectTopBar({ projectId, projectName, members, currentUserId, stats }: Props) {
  const analystMember = members.find((m) => m.user.id === currentUserId);
  const analystName = analystMember?.user.name ?? "Analyst";

  const lastAct = new Date(stats.lastActivity);
  const formattedActivity = lastAct.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + lastAct.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div className="h-16 bg-surface border-b border-border px-6 flex items-center justify-between shrink-0 gap-4">
      {/* Left: Project, Case ID, Status */}
      <div className="flex items-center gap-6 min-w-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Cases
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold truncate max-w-[150px]">{projectName}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm font-bold text-foreground">CASE-{projectId.slice(0, 8).toUpperCase()}</span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ACTIVE INVESTIGATION
            </span>
          </div>
        </div>
      </div>

      {/* Center: Search & Metric Pills */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl justify-center">
        <div className="hidden lg:block w-48 xl:w-64">
          <ProjectSearch projectId={projectId} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EF4444]/15 border border-[#EF4444]/20">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Critical</span>
            <span className="text-xs font-bold text-[#EF4444]">{stats.criticalFindingsCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/20">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Alerts</span>
            <span className="text-xs font-bold text-[#F59E0B]">{stats.alertsCount}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#3B82F6]/15 border border-[#3B82F6]/20">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Assets</span>
            <span className="text-xs font-bold text-[#3B82F6]">{stats.assetsCount}</span>
          </div>
        </div>
      </div>

      {/* Right: Risk Score, Analyst, Last Activity */}
      <div className="flex items-center gap-6 shrink-0 text-right">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted font-medium">Risk Score</span>
          <div className="flex items-center gap-1.5 justify-end mt-0.5">
            <span className={`text-xs font-bold ${
              stats.riskScore > 75 ? "text-red-500" :
              stats.riskScore > 40 ? "text-orange-500" :
              stats.riskScore > 15 ? "text-yellow-500" : "text-emerald-500"
            }`}>{stats.riskScore}/100</span>
            <span className="text-[10px] text-muted font-medium">({stats.riskLevel})</span>
          </div>
        </div>

        <div className="flex flex-col border-l border-border pl-6">
          <span className="text-[10px] uppercase tracking-wider text-muted font-medium">Analyst</span>
          <span className="text-xs font-semibold text-foreground mt-0.5">{analystName}</span>
        </div>

        <div className="flex flex-col border-l border-border pl-6">
          <span className="text-[10px] uppercase tracking-wider text-muted font-medium">Last Activity</span>
          <span className="text-xs text-muted mt-0.5" suppressHydrationWarning>{formattedActivity}</span>
        </div>
      </div>
    </div>
  );
}

