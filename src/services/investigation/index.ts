import { request, agentRequest, platformClient } from '../../api/request';
import { Endpoints } from '../../api/endpoints';
import * as Types from '../../types/api';

export class InvestigationService {
  // ─── Platform Assets ────────────────────────────────────────────────────────

  static async getAssets(projectId: string): Promise<Types.Asset[]> {
    return request.get<Types.Asset[]>(Endpoints.projects.assets.list(projectId));
  }

  static async createAsset(projectId: string, payload: Types.CreateAssetRequest): Promise<Types.Asset> {
    return request.post<Types.Asset>(Endpoints.projects.assets.create(projectId), payload);
  }

  static async updateAsset(projectId: string, assetId: string, payload: Types.UpdateAssetRequest): Promise<Types.Asset> {
    return request.put<Types.Asset>(Endpoints.projects.assets.update(projectId, assetId), payload);
  }

  static async deleteAsset(projectId: string, assetId: string): Promise<void> {
    return request.delete<void>(Endpoints.projects.assets.delete(projectId, assetId));
  }

  static async importAssets(projectId: string, formData: FormData): Promise<{ count: number }> {
    return platformClient.upload<{ count: number }>(Endpoints.projects.assets.import(projectId), formData);
  }

  // ─── Platform Capture Session ───────────────────────────────────────────────

  static async getCaptureSession(projectId: string): Promise<Types.CaptureSession> {
    return request.get<Types.CaptureSession>(Endpoints.projects.captureSession.get(projectId));
  }

  static async updateCaptureSession(projectId: string, payload: Partial<Types.CaptureSession>): Promise<Types.CaptureSession> {
    return request.put<Types.CaptureSession>(Endpoints.projects.captureSession.update(projectId), payload);
  }

  static async deleteCaptureSession(projectId: string): Promise<void> {
    return request.delete<void>(Endpoints.projects.captureSession.delete(projectId));
  }

  // ─── Platform Scans ─────────────────────────────────────────────────────────

  static async getScans(projectId: string): Promise<Types.Scan[]> {
    return request.get<Types.Scan[]>(Endpoints.projects.scans.list(projectId));
  }

  static async saveScan(projectId: string, payload: Types.SaveScanRequest): Promise<Types.Scan> {
    return request.post<Types.Scan>(Endpoints.projects.scans.create(projectId), payload);
  }

  // ─── Platform Timeline ──────────────────────────────────────────────────────

  static async getTimeline(projectId: string): Promise<Types.TimelineEntry[]> {
    return request.get<Types.TimelineEntry[]>(Endpoints.projects.timeline.get(projectId));
  }

  static async createTimelineEntry(projectId: string, payload: Types.CreateTimelineRequest): Promise<Types.TimelineEntry> {
    return request.post<Types.TimelineEntry>(Endpoints.projects.timeline.create(projectId), payload);
  }

  // ─── Platform Search ────────────────────────────────────────────────────────

  static async search(projectId: string, query: string): Promise<any> {
    return request.get<any>(`${Endpoints.projects.search.query(projectId)}?q=${encodeURIComponent(query)}`);
  }

  // ─── Agent Direct APIs ──────────────────────────────────────────────────────

  static async getInterfaces(): Promise<Types.AgentInterface[]> {
    return agentRequest.get<Types.AgentInterface[]>(Endpoints.agent.interfaces);
  }

  static async startAgentCapture(projectId: string, payload: { interface: string; filter?: string }): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.captureSession(projectId), payload);
  }

  static async stopAgentCapture(projectId: string): Promise<any> {
    return agentRequest.delete<any>(Endpoints.agent.captureSession(projectId));
  }

  static async getAgentCaptureStatus(projectId: string): Promise<any> {
    return agentRequest.get<any>(Endpoints.agent.captureSession(projectId));
  }

  static async analyzeAgentCapture(): Promise<any> {
    return agentRequest.get<any>(Endpoints.agent.analyzeCapture);
  }

  static async getAgentRiskRanking(): Promise<any> {
    return agentRequest.get<any>(Endpoints.agent.riskRanking);
  }

  static async downloadAgentCapture(): Promise<Blob> {
    return agentRequest.get<Blob>(Endpoints.agent.downloadCapture);
  }

  static async getAgentPcapSummary(pcapPath: string): Promise<Types.AgentPcapSummary> {
    return agentRequest.post<Types.AgentPcapSummary>(Endpoints.agent.pcapSummary, { pcapPath });
  }

  static async analyzeAgentPcap(payload: Types.AgentPcapAnalyzeRequest): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.pcapAnalyze, payload);
  }

  static async getAgentPcapPackets(payload: Types.AgentPcapPacketsRequest): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.pcapPackets, payload);
  }

  static async getAgentPacketDetails(payload: { packetId: number; pcapPath?: string }): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.packetDetails, payload);
  }

  static async getAgentFollowStream(payload: { streamId: number; proto: string; pcapPath?: string }): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.followStream, payload);
  }

  static async getAgentDns(): Promise<Types.AgentDnsInfo[]> {
    return agentRequest.get<Types.AgentDnsInfo[]>(Endpoints.agent.dns);
  }

  static async getAgentFindings(): Promise<Types.AgentFinding[]> {
    return agentRequest.get<Types.AgentFinding[]>(Endpoints.agent.findings);
  }

  static async getAgentIocs(): Promise<Types.AgentIoc[]> {
    return agentRequest.get<Types.AgentIoc[]>(Endpoints.agent.iocs);
  }

  static async getAgentIpInfo(ip: string): Promise<Types.AgentIpInfo> {
    return agentRequest.get<Types.AgentIpInfo>(Endpoints.agent.ipInfo(ip));
  }

  static async getAgentIpReputation(ip: string): Promise<Types.AgentIpReputation> {
    return agentRequest.get<Types.AgentIpReputation>(Endpoints.agent.ipReputation(ip));
  }

  static async runAgentScan(payload: Types.AgentScanRequest): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.scan, payload);
  }
}
