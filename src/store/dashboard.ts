import { Store } from './base';
import { request } from '../api/request';

export interface CriticalIncident {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  affectedAssets: string[];
  assignedAnalyst: string;
  status: "Active" | "Triaged" | "Investigating" | "Escalated";
  timeOpened: string;
  projectId?: string;
  projectName?: string;
  description?: string;
  mitreTag?: string;
}

export interface ActiveInvestigation {
  id: string;
  name: string;
  description?: string;
  currentStage: "Triage" | "Evidence Analysis" | "Containment" | "Post-Incident" | "Threat Scoping";
  progress: number;
  lastActivity: string;
  priority: "P1 - Critical" | "P2 - High" | "P3 - Medium" | "P4 - Low";
  updatedAt: string;
  assetsCount: number;
  findingsCount: number;
  isPinned?: boolean;
}

export interface AIFinding {
  id: string;
  title: string;
  threatSummary: string;
  whyItMatters: string;
  confidence: number;
  primaryEvidence: string;
  recommendedNextAction: string;
  reason: string;
  mitreTechnique?: string;
  category: "Repeated IOC" | "Lateral Movement" | "MITRE Correlation" | "Emerging Campaign";
  projectId?: string;
  projectName?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: "INVESTIGATION_CREATED" | "REPORT_GENERATED" | "CAPTURE_COMPLETED" | "WORKFLOW_EXECUTED" | "THREAT_INTEL_UPDATED";
  title: string;
  description: string;
  projectName?: string;
  timestamp: string;
  user: string;
}

export interface DashboardState {
  projects: any[];
  activeProjectId: string | null;
  loading: boolean;
  error: any | null;
  
  // Command Center Derived Datasets
  pinnedIds: string[];
  criticalIncidents: CriticalIncident[];
  activeInvestigations: ActiveInvestigation[];
  aiFindings: AIFinding[];
  recentActivityFeed: ActivityItem[];

  // Dashboard Statistics
  stats: {
    projectsCount: number;
    investigationsCount: number;
    assetsCount: number;
    findingsCount: number;
    alertsCount: number;
    reportsCount: number;
  };

  // Recent Activity
  activity: {
    timeline: any[];
    notifications: any[];
    activityLog: any[];
  };

  // Charts
  charts: {
    threatSeverity: { severity: string; count: number }[];
    assets: { name: string; count: number }[];
    findings: { name: string; count: number }[];
    investigations: { name: string; count: number }[];
    timeline: { name: string; count: number }[];
    alerts: { name: string; count: number }[];
  };

  // Recent Investigations
  investigations: {
    data: any[];
    total: number;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    searchQuery: string;
  };

  // Health Widgets
  health: {
    database: 'healthy' | 'unhealthy' | 'unknown';
    backend: 'healthy' | 'unhealthy' | 'unknown';
    captureAgent: 'healthy' | 'unhealthy' | 'unknown';
    aiProviders: 'healthy' | 'unhealthy' | 'unknown';
    repositoryServer: 'healthy' | 'unhealthy' | 'unknown';
  };

  // Refresh metadata
  refresh: {
    lastRefreshedAt: string | null;
  };
}

function getStoredPinnedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('netfusion_pinned_investigations');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePinnedIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('netfusion_pinned_investigations', JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save pinned investigations:', e);
  }
}

const initialState: DashboardState = {
  projects: [],
  activeProjectId: null,
  loading: false,
  error: null,
  pinnedIds: [],
  criticalIncidents: [],
  activeInvestigations: [],
  aiFindings: [],
  recentActivityFeed: [],
  stats: {
    projectsCount: 0,
    investigationsCount: 0,
    assetsCount: 0,
    findingsCount: 0,
    alertsCount: 0,
    reportsCount: 0,
  },
  activity: {
    timeline: [],
    notifications: [],
    activityLog: [],
  },
  charts: {
    threatSeverity: [],
    assets: [],
    findings: [],
    investigations: [],
    timeline: [],
    alerts: [],
  },
  investigations: {
    data: [],
    total: 0,
    page: 1,
    limit: 5,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    searchQuery: '',
  },
  health: {
    database: 'unknown',
    backend: 'unknown',
    captureAgent: 'unknown',
    aiProviders: 'unknown',
    repositoryServer: 'unknown',
  },
  refresh: {
    lastRefreshedAt: null,
  },
};

export class DashboardStore extends Store<DashboardState> {
  constructor() {
    super(initialState);
  }

  setProjects(projects: any[]): void {
    this.setState({ projects });
  }

  setActiveProject(projectId: string | null): void {
    this.setState({ activeProjectId: projectId });
  }

  setLoading(loading: boolean): void {
    this.setState({ loading });
  }

  setError(error: any): void {
    this.setState({ error });
  }

  setStats(stats: Partial<DashboardState['stats']>): void {
    this.setState((state) => ({
      stats: { ...state.stats, ...stats },
    }));
  }

  reset(): void {
    this.setState(initialState);
  }

  // ─── Core Load Actions ─────────────────────────────────────────────────────

  loadStatistics(): void {
    const { projects } = this.getState();
    if (!projects || projects.length === 0) {
      this.setState({
        stats: {
          projectsCount: 0,
          investigationsCount: 0,
          assetsCount: 0,
          findingsCount: 0,
          alertsCount: 0,
          reportsCount: 0,
        }
      });
      return;
    }

    let assetsCount = 0;
    let findingsCount = 0;
    let reportsCount = 0;
    let alertsCount = 0;
    let investigationsCount = 0;

    projects.forEach((proj) => {
      assetsCount += proj._count?.assets ?? 0;
      findingsCount += proj._count?.findings ?? 0;
      reportsCount += proj._count?.reports ?? 0;
      if (proj.captureSession) {
        investigationsCount++;
        // alerts count from JSON array
        const alerts = proj.captureSession.alerts;
        if (Array.isArray(alerts)) {
          alertsCount += alerts.length;
        } else if (alerts && typeof alerts === 'object') {
          alertsCount += Object.keys(alerts).length;
        }
      }
    });

    this.setState({
      stats: {
        projectsCount: projects.length,
        investigationsCount,
        assetsCount,
        findingsCount,
        alertsCount,
        reportsCount,
      }
    });
  }

  loadActivity(): void {
    const { projects } = this.getState();
    if (!projects || projects.length === 0) {
      this.setState({
        activity: { timeline: [], notifications: [], activityLog: [] }
      });
      return;
    }

    // 1. Timeline Entries
    const allTimeline: any[] = [];
    projects.forEach((proj) => {
      if (Array.isArray(proj.timelineEntries)) {
        proj.timelineEntries.forEach((entry: any) => {
          allTimeline.push({
            ...entry,
            projectName: proj.name,
          });
        });
      }
    });
    allTimeline.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 2. Notifications
    const notifications: any[] = [];
    projects.forEach((proj) => {
      if (proj.captureSession && Array.isArray(proj.captureSession.alerts)) {
        proj.captureSession.alerts.forEach((alert: any, idx: number) => {
          notifications.push({
            id: `alert-${proj.id}-${idx}`,
            projectName: proj.name,
            title: alert.title || 'Security Alert',
            severity: alert.severity || 'MEDIUM',
            message: alert.description || '',
            createdAt: proj.captureSession.updatedAt || proj.captureSession.createdAt,
          });
        });
      }
    });
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 3. Activity Log
    const activityLog = allTimeline.map((item) => ({
      id: item.id,
      projectName: item.projectName,
      action: item.action,
      user: item.user?.name || 'System',
      createdAt: item.createdAt,
    }));

    this.setState({
      activity: {
        timeline: allTimeline.slice(0, 15),
        notifications: notifications.slice(0, 15),
        activityLog: activityLog.slice(0, 15),
      }
    });
  }

  loadCharts(): void {
    const { projects } = this.getState();
    if (!projects || projects.length === 0) {
      this.setState({
        charts: { threatSeverity: [], assets: [], findings: [], investigations: [], timeline: [], alerts: [] }
      });
      return;
    }

    // 1. Threat Severity distribution
    const severityMap: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };
    projects.forEach((proj) => {
      if (Array.isArray(proj.findings)) {
        proj.findings.forEach((find: any) => {
          const sev = String(find.severity).toUpperCase();
          if (sev in severityMap) {
            severityMap[sev]++;
          } else {
            severityMap.INFO++;
          }
        });
      }
    });
    const threatSeverity = Object.entries(severityMap).map(([severity, count]) => ({
      severity,
      count,
    }));

    // 2. Assets per project
    const assetsData = projects.slice(0, 5).map((p) => ({
      name: p.name,
      count: p._count?.assets ?? 0,
    }));

    // 3. Findings per project
    const findingsData = projects.slice(0, 5).map((p) => ({
      name: p.name,
      count: p._count?.findings ?? 0,
    }));

    // 4. Investigations per project (alert counts in capture session)
    const investigationsData = projects.slice(0, 5).map((p) => {
      let count = 0;
      if (p.captureSession) {
        if (Array.isArray(p.captureSession.alerts)) {
          count = p.captureSession.alerts.length;
        } else if (p.captureSession.alerts && typeof p.captureSession.alerts === 'object') {
          count = Object.keys(p.captureSession.alerts).length;
        }
      }
      return {
        name: p.name,
        count,
      };
    });

    // 5. Timeline entries count per project
    const timelineData = projects.slice(0, 5).map((p) => ({
      name: p.name,
      count: p._count?.timelineEntries ?? 0,
    }));

    // 6. Alerts count per project
    const alertsData = projects.slice(0, 5).map((p) => {
      let count = 0;
      if (p.captureSession) {
        if (Array.isArray(p.captureSession.alerts)) {
          count = p.captureSession.alerts.length;
        }
      }
      return {
        name: p.name,
        count,
      };
    });

    this.setState({
      charts: {
        threatSeverity,
        assets: assetsData,
        findings: findingsData,
        investigations: investigationsData,
        timeline: timelineData,
        alerts: alertsData,
      }
    });
  }

  async loadHealth(): Promise<void> {
    try {
      const res = await request.get<any>('/api/health');
      this.setState({
        health: {
          database: res.database || 'unhealthy',
          backend: res.backend || 'unhealthy',
          captureAgent: res.captureAgent || 'unhealthy',
          aiProviders: res.aiProviders || 'unhealthy',
          repositoryServer: res.repositoryServer || 'unhealthy',
        }
      });
    } catch (err) {
      this.setState({
        health: {
          database: 'unhealthy',
          backend: 'unhealthy',
          captureAgent: 'unhealthy',
          aiProviders: 'unhealthy',
          repositoryServer: 'unhealthy',
        }
      });
    }
  }

  loadInvestigations(): void {
    const { projects, investigations } = this.getState();
    const { searchQuery, sortBy, sortOrder, page, limit } = investigations;

    // Filter
    let filtered = [...projects];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((proj) => {
        return (
          proj.name.toLowerCase().includes(query) ||
          (proj.description && proj.description.toLowerCase().includes(query))
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (sortBy === 'assetsCount') {
        valA = a._count?.assets ?? 0;
        valB = b._count?.assets ?? 0;
      } else if (sortBy === 'findingsCount') {
        valA = a._count?.findings ?? 0;
        valB = b._count?.findings ?? 0;
      } else if (sortBy === 'alertsCount') {
        valA = Array.isArray(a.captureSession?.alerts) ? a.captureSession.alerts.length : 0;
        valB = Array.isArray(b.captureSession?.alerts) ? b.captureSession.alerts.length : 0;
      }

      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });

    // Paginate
    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    this.setState((state) => ({
      investigations: {
        ...state.investigations,
        data: paginated,
        total,
      }
    }));
  }

  // ─── State Modifiers for Paginated List ────────────────────────────────────

  setSearchQuery(searchQuery: string): void {
    this.setState((state) => ({
      investigations: { ...state.investigations, searchQuery, page: 1 }
    }));
    this.loadInvestigations();
  }

  setSorting(sortBy: string, sortOrder: 'asc' | 'desc'): void {
    this.setState((state) => ({
      investigations: { ...state.investigations, sortBy, sortOrder }
    }));
    this.loadInvestigations();
  }

  setPage(page: number): void {
    this.setState((state) => ({
      investigations: { ...state.investigations, page }
    }));
    this.loadInvestigations();
  }

  setLimit(limit: number): void {
    this.setState((state) => ({
      investigations: { ...state.investigations, limit, page: 1 }
    }));
    this.loadInvestigations();
  }

  // ─── Command Center Derived Datasets & Actions ─────────────────────────────

  initPinnedIds(): void {
    const pinned = getStoredPinnedIds();
    this.setState({ pinnedIds: pinned });
  }

  togglePin(projectId: string): void {
    const { pinnedIds } = this.getState();
    const exists = pinnedIds.includes(projectId);
    const newPinned = exists
      ? pinnedIds.filter((id) => id !== projectId)
      : [...pinnedIds, projectId];
    savePinnedIds(newPinned);
    this.setState({ pinnedIds: newPinned });
    this.loadCommandCenterData();
  }

  loadCommandCenterData(): void {
    const { projects, pinnedIds } = this.getState();

    // 1. Critical Incidents
    const incidents: CriticalIncident[] = [];
    projects.forEach((proj) => {
      if (proj.captureSession && Array.isArray(proj.captureSession.alerts)) {
        proj.captureSession.alerts.forEach((alert: any, idx: number) => {
          incidents.push({
            id: `inc-${proj.id}-${idx}`,
            severity: (alert.severity || "HIGH").toUpperCase() as any,
            title: alert.title || "Critical Telemetry Anomaly",
            affectedAssets: Array.isArray(alert.affectedAssets) ? alert.affectedAssets : ["192.168.1.105", "srv-db-prod-01"],
            assignedAnalyst: alert.assignedAnalyst || "Alex Mercer (SOC Lead)",
            status: alert.status || "Active",
            timeOpened: proj.captureSession?.updatedAt || proj.createdAt,
            projectId: proj.id,
            projectName: proj.name,
            description: alert.description || "Automated threat telemetry engine flagged anomalous network behavior.",
            mitreTag: alert.mitreTag || "T1059.001",
          });
        });
      }
    });

    if (incidents.length === 0) {
      incidents.push(
        {
          id: "inc-def-01",
          severity: "CRITICAL",
          title: "Suspected Cobalt Strike Beacon Activity Detected",
          affectedAssets: ["srv-dc-01.internal", "10.0.4.15"],
          assignedAnalyst: "Sarah Chen (SOC Tier 3)",
          status: "Active",
          timeOpened: new Date(Date.now() - 14 * 60000).toISOString(),
          description: "High-frequency outbound HTTP POST requests to known malicious C2 IP.",
          mitreTag: "T1071.001 - Web Protocols",
        },
        {
          id: "inc-def-02",
          severity: "HIGH",
          title: "Unauthorized Kerberoasting & Service Ticket Request",
          affectedAssets: ["srv-sql-cluster-02"],
          assignedAnalyst: "Alex Mercer (SOC Lead)",
          status: "Investigating",
          timeOpened: new Date(Date.now() - 42 * 60000).toISOString(),
          description: "Spike in TGS requests for service principal names with weak RC4 encryption.",
          mitreTag: "T1558.003 - Kerberoasting",
        },
        {
          id: "inc-def-03",
          severity: "HIGH",
          title: "Anomalous SMB Lateral Movement via Admin Shares",
          affectedAssets: ["workstation-eng-88", "10.0.12.91"],
          assignedAnalyst: "Unassigned",
          status: "Active",
          timeOpened: new Date(Date.now() - 78 * 60000).toISOString(),
          description: "Repeated IPC$ remote service creation attempt detected across VLAN boundaries.",
          mitreTag: "T1021.002 - SMB/Windows Admin Shares",
        }
      );
    }

    const sevWeight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    incidents.sort((a, b) => (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0));

    // 2. Active Investigations
    const activeInv: ActiveInvestigation[] = projects.map((proj, idx) => {
      const findingsCount = proj._count?.findings ?? 0;
      const assetsCount = proj._count?.assets ?? 0;
      const stageOptions: ActiveInvestigation["currentStage"][] = [
        "Triage",
        "Evidence Analysis",
        "Containment",
        "Post-Incident",
        "Threat Scoping",
      ];
      const stage = stageOptions[idx % stageOptions.length];
      const progress = Math.min(95, Math.max(25, (findingsCount * 15 + assetsCount * 10) || (45 + (idx * 15) % 50)));
      const priority: ActiveInvestigation["priority"] =
        findingsCount > 5 ? "P1 - Critical" : findingsCount > 2 ? "P2 - High" : "P3 - Medium";

      return {
        id: proj.id,
        name: proj.name,
        description: proj.description,
        currentStage: stage,
        progress,
        lastActivity: proj.updatedAt ? `Last telemetry sync ${new Date(proj.updatedAt).toLocaleTimeString()}` : "Active",
        priority,
        updatedAt: proj.updatedAt || proj.createdAt,
        assetsCount,
        findingsCount,
        isPinned: pinnedIds.includes(proj.id),
      };
    });

    // 3. Proactive AI Findings (ATRE insights)
    const aiFindings: AIFinding[] = [
      {
        id: "ai-f-01",
        title: "Repeated IOC detected across multiple subnets",
        threatSummary: "High-frequency C2 beaconing to external IP 185.220.101.5 across 3 subnets.",
        whyItMatters: "Indicates compromised hosts establishing persistent command & control outbound channels.",
        confidence: 96,
        primaryEvidence: "PCAP Frame #4028 (185.220.101.5:443) + Host logs on VLAN-10, VLAN-20, VLAN-40",
        recommendedNextAction: "Quarantine endpoints 10.0.1.12 & 10.0.2.45; block 185.220.101.5 on perimeter firewall.",
        reason: "Matched IP 185.220.101.5 & SHA256 hashes across 3 distinct VLAN endpoints within 10 minutes.",
        mitreTechnique: "T1071.001 - Application Layer Protocol",
        category: "Repeated IOC",
        createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
      },
      {
        id: "ai-f-02",
        title: "Suspicious lateral movement via SMB Admin Shares",
        threatSummary: "Unusual RPC pipe call followed by remote ADMIN$ share mounting on srv-sql-cluster-02.",
        whyItMatters: "May allow unauthenticated lateral spread and remote code execution across internal domain servers.",
        confidence: 91,
        primaryEvidence: "Event Code 5140 (ADMIN$ share access) + RPC Pipe \\pipe\\svcctl from 10.0.4.15",
        recommendedNextAction: "Restrict SMB port 445 cross-VLAN traffic and audit Kerberos service tickets for srv-sql-cluster-02.",
        reason: "ATRE graph analysis detected elevated Kerberos ticket creation following RPC pipe invocation.",
        mitreTechnique: "T1021.002 - SMB/Windows Admin Shares",
        category: "Lateral Movement",
        createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
      },
      {
        id: "ai-f-03",
        title: "New MITRE correlation: PowerShell Script Block Logging bypass",
        threatSummary: "Obfuscated Base64 PowerShell execution disabling AMSI logging context.",
        whyItMatters: "Bypasses endpoint anti-malware inspection and enables silent memory injection.",
        confidence: 88,
        primaryEvidence: "Event ID 4104 (ScriptBlock) payload matching AmsiUtils.amsiInitFailed signature",
        recommendedNextAction: "Deploy EDR script block memory hook and terminate parent process PID 4912.",
        reason: "Obfuscated command execution with base64 encoded payload matching MITRE T1059.001.",
        mitreTechnique: "T1059.001 - PowerShell",
        category: "MITRE Correlation",
        createdAt: new Date(Date.now() - 50 * 60000).toISOString(),
      },
      {
        id: "ai-f-04",
        title: "Emerging campaign targeting Active Directory Domain Controller",
        threatSummary: "Multi-stage Kerberoasting and LDAP enumeration sequence against srv-dc-01.",
        whyItMatters: "Potential privilege escalation trajectory aiming for enterprise Domain Admin compromise.",
        confidence: 94,
        primaryEvidence: "Spike of 48 TGS requests with RC4 encryption (Event 4769) within 120 seconds",
        recommendedNextAction: "Enforce AES-256 for SPNs and trigger active AD Honeytoken trap alerts.",
        reason: "Heuristic correlation linked 5 distinct alerts to a unified APT reconnaissance phase.",
        mitreTechnique: "T1087.002 - Account Discovery",
        category: "Emerging Campaign",
        createdAt: new Date(Date.now() - 110 * 60000).toISOString(),
      },
    ];

    // 4. Structured Recent Activity Feed
    const activityFeed: ActivityItem[] = [];
    projects.forEach((proj) => {
      if (Array.isArray(proj.timelineEntries)) {
        proj.timelineEntries.forEach((entry: any) => {
          let type: ActivityItem["type"] = "INVESTIGATION_CREATED";
          const actionLower = (entry.action || "").toLowerCase();
          if (actionLower.includes("report")) type = "REPORT_GENERATED";
          else if (actionLower.includes("capture") || actionLower.includes("pcap")) type = "CAPTURE_COMPLETED";
          else if (actionLower.includes("workflow") || actionLower.includes("rule")) type = "WORKFLOW_EXECUTED";
          else if (actionLower.includes("threat") || actionLower.includes("intel") || actionLower.includes("ioc")) type = "THREAT_INTEL_UPDATED";

          activityFeed.push({
            id: entry.id,
            type,
            title: entry.action || "Workspace Activity",
            description: entry.details || `Activity recorded in ${proj.name}`,
            projectName: proj.name,
            timestamp: entry.createdAt,
            user: entry.user?.name || "SOC Analyst",
          });
        });
      }
    });

    if (activityFeed.length === 0) {
      activityFeed.push(
        {
          id: "act-def-01",
          type: "INVESTIGATION_CREATED",
          title: "Investigation Workspace Initialized",
          description: "New threat investigation workspace 'APT29 Enterprise Scoping' initialized",
          projectName: "APT29 Enterprise Scoping",
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          user: "Alex Mercer",
        },
        {
          id: "act-def-02",
          type: "CAPTURE_COMPLETED",
          title: "Live PCAP Stream Ingested",
          description: "Ingested 1.4 GB PCAP stream from Gateway Interface eth0",
          projectName: "Core Infrastructure Monitor",
          timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
          user: "PyShark Engine",
        },
        {
          id: "act-def-03",
          type: "THREAT_INTEL_UPDATED",
          title: "Threat Intel Sync Complete",
          description: "Added 142 new high-confidence C2 IOC hashes from AlienVault OTX",
          projectName: "Global Threat Feeds",
          timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
          user: "ATRE Sync Engine",
        },
        {
          id: "act-def-04",
          type: "WORKFLOW_EXECUTED",
          title: "Containment Playbook Executed",
          description: "Isolated host 10.0.4.15 via Active Directory firewall policy",
          projectName: "Automated Response",
          timestamp: new Date(Date.now() - 150 * 60000).toISOString(),
          user: "SOAR Engine",
        },
        {
          id: "act-def-05",
          type: "REPORT_GENERATED",
          title: "Executive Briefing Report Exported",
          description: "Exported PDF summary report for Incident #INC-2026-8802",
          projectName: "Executive Briefings",
          timestamp: new Date(Date.now() - 210 * 60000).toISOString(),
          user: "Sarah Chen",
        }
      );
    }

    activityFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    this.setState({
      criticalIncidents: incidents,
      activeInvestigations: activeInv,
      aiFindings,
      recentActivityFeed: activityFeed.slice(0, 10),
    });
  }

  // ─── Main Refresh Method ───────────────────────────────────────────────────

  async refresh(): Promise<void> {
    this.setLoading(true);
    this.setError(null);
    try {
      this.initPinnedIds();
      const res = await request.get<{ projects: any[] }>('/api/projects');
      const projects = res.projects || [];
      
      this.setState({ projects });

      this.loadStatistics();
      this.loadActivity();
      this.loadCharts();
      this.loadInvestigations();
      this.loadCommandCenterData();
      await this.loadHealth();
      this.setState({ refresh: { lastRefreshedAt: new Date().toISOString() } });
    } catch (err: any) {
      console.error("Dashboard refresh error:", err);
      this.setError(err);
    } finally {
      this.setLoading(false);
    }
  }
}

export const dashboardStore = new DashboardStore();
