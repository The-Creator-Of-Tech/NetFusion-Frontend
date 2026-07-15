import { Store } from './base';
import * as Types from '../types/api';
import { request } from '../api/request';

export interface DashboardState {
  projects: any[];
  activeProjectId: string | null;
  loading: boolean;
  error: any | null;
  
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

const initialState: DashboardState = {
  projects: [],
  activeProjectId: null,
  loading: false,
  error: null,
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

  // ─── Main Refresh Method ───────────────────────────────────────────────────

  async refresh(): Promise<void> {
    this.setLoading(true);
    this.setError(null);
    try {
      const res = await request.get<{ projects: any[] }>('/api/projects');
      const projects = res.projects || [];
      
      this.setState({ projects });

      this.loadStatistics();
      this.loadActivity();
      this.loadCharts();
      this.loadInvestigations();
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
