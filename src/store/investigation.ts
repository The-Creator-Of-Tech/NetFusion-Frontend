import { Store } from './base';
import * as Types from '../types/api';
import { request } from '../api/request';

export interface InvestigationState {
  assets: Types.Asset[];
  captureSession: Types.CaptureSession | null;
  interfaces: Types.AgentInterface[];
  packets: any[];
  selectedPacket: any | null;
  dnsInfo: Types.AgentDnsInfo[];
  findings: Types.Finding[];
  timeline: Types.TimelineEntry[];
  loading: boolean;
  error: any | null;
  refresh: {
    lastRefreshedAt: string | null;
  };
}

const initialState: InvestigationState = {
  assets: [],
  captureSession: null,
  interfaces: [],
  packets: [],
  selectedPacket: null,
  dnsInfo: [],
  findings: [],
  timeline: [],
  loading: false,
  error: null,
  refresh: {
    lastRefreshedAt: null,
  },
};

export class InvestigationStore extends Store<InvestigationState> {
  constructor() {
    super(initialState);
  }

  setAssets(assets: Types.Asset[]): void {
    this.setState({ assets });
  }

  addAsset(asset: Types.Asset): void {
    this.setState((state) => ({
      assets: [...state.assets, asset],
    }));
  }

  updateAssetInState(asset: Types.Asset): void {
    this.setState((state) => ({
      assets: state.assets.map((a) => (a.id === asset.id ? asset : a)),
    }));
  }

  removeAsset(assetId: string): void {
    this.setState((state) => ({
      assets: state.assets.filter((a) => a.id !== assetId),
    }));
  }

  setCaptureSession(captureSession: Types.CaptureSession | null): void {
    this.setState({ captureSession });
  }

  setInterfaces(interfaces: Types.AgentInterface[]): void {
    this.setState({ interfaces });
  }

  setPackets(packets: any[]): void {
    this.setState({ packets });
  }

  addPacket(packet: any): void {
    this.setState((state) => ({
      packets: [...state.packets, packet],
    }));
  }

  setSelectedPacket(selectedPacket: any | null): void {
    this.setState({ selectedPacket });
  }

  setDnsInfo(dnsInfo: Types.AgentDnsInfo[]): void {
    this.setState({ dnsInfo });
  }

  setFindings(findings: Types.Finding[]): void {
    this.setState({ findings });
  }

  addFinding(finding: Types.Finding): void {
    this.setState((state) => ({
      findings: [...state.findings, finding],
    }));
  }

  updateFindingInState(finding: Types.Finding): void {
    this.setState((state) => ({
      findings: state.findings.map((f) => (f.id === finding.id ? finding : f)),
    }));
  }

  removeFinding(findingId: string): void {
    this.setState((state) => ({
      findings: state.findings.filter((f) => f.id !== findingId),
    }));
  }

  setTimeline(timeline: Types.TimelineEntry[]): void {
    this.setState({ timeline });
  }

  addTimelineEntry(entry: Types.TimelineEntry): void {
    this.setState((state) => ({
      // Prepend so the new entry appears at the top (matching DESC sort order)
      timeline: [entry, ...state.timeline],
    }));
  }

  setLoading(loading: boolean): void {
    this.setState({ loading });
  }

  setError(error: any): void {
    this.setState({ error });
  }

  reset(): void {
    this.setState(initialState);
  }

  // ─── Async Actions for Investigation ───────────────────────────────────────

  async loadAssets(projectId: string): Promise<void> {
    try {
      const res = await request.get<{ assets: Types.Asset[] }>(`/api/projects/${projectId}/assets`);
      this.setState({ assets: res.assets || [] });
    } catch (err) {
      console.error('Failed to load assets:', err);
      throw err;
    }
  }

  async loadFindings(projectId: string): Promise<void> {
    try {
      const res = await request.get<{ findings: Types.Finding[] }>(`/api/projects/${projectId}/findings`);
      this.setState({ findings: res.findings || [] });
    } catch (err) {
      console.error('Failed to load findings:', err);
      throw err;
    }
  }

  async loadTimeline(projectId: string): Promise<void> {
    try {
      const res = await request.get<{ entries: Types.TimelineEntry[] }>(`/api/projects/${projectId}/timeline`);
      this.setState({ timeline: res.entries || [] });
    } catch (err) {
      console.error('Failed to load timeline:', err);
      throw err;
    }
  }

  async loadCaptureSession(projectId: string): Promise<void> {
    try {
      const res = await request.get<{ session: Types.CaptureSession | null }>(`/api/projects/${projectId}/capture-session`);
      this.setState({ captureSession: res.session || null });
    } catch (err) {
      console.error('Failed to load capture session:', err);
      throw err;
    }
  }

  async refresh(projectId: string): Promise<void> {
    this.setLoading(true);
    this.setError(null);
    try {
      await Promise.all([
        this.loadAssets(projectId),
        this.loadFindings(projectId),
        this.loadTimeline(projectId),
        this.loadCaptureSession(projectId),
      ]);
      this.setState({ refresh: { lastRefreshedAt: new Date().toISOString() } });
    } catch (err: any) {
      console.error('Failed to refresh investigation workspace:', err);
      this.setError(err);
    } finally {
      this.setLoading(false);
    }
  }
}

export const investigationStore = new InvestigationStore();
