import { request, agentRequest } from '../../api/request';
import { Endpoints } from '../../api/endpoints';
import * as Types from '../../types/api';

export class KnowledgeService {
  // ─── Platform Notes ─────────────────────────────────────────────────────────

  static async getNotes(projectId: string): Promise<Types.Note[]> {
    return request.get<Types.Note[]>(Endpoints.projects.notes.get(projectId));
  }

  static async updateNotes(projectId: string, content: string): Promise<Types.Note> {
    return request.put<Types.Note>(Endpoints.projects.notes.update(projectId), { content });
  }

  // ─── Platform Findings ──────────────────────────────────────────────────────

  static async getFindings(projectId: string): Promise<Types.Finding[]> {
    return request.get<Types.Finding[]>(Endpoints.projects.findings.list(projectId));
  }

  static async createFinding(projectId: string, payload: Types.CreateFindingRequest): Promise<Types.Finding> {
    return request.post<Types.Finding>(Endpoints.projects.findings.create(projectId), payload);
  }

  static async updateFinding(projectId: string, findingId: string, payload: Types.UpdateFindingRequest): Promise<Types.Finding> {
    return request.put<Types.Finding>(Endpoints.projects.findings.update(projectId, findingId), payload);
  }

  static async deleteFinding(projectId: string, findingId: string): Promise<void> {
    return request.delete<void>(Endpoints.projects.findings.delete(projectId, findingId));
  }

  // ─── Platform Reports ───────────────────────────────────────────────────────

  static async getReports(projectId: string): Promise<Types.Report[]> {
    return request.get<Types.Report[]>(Endpoints.projects.reports.list(projectId));
  }

  static async generateReport(projectId: string, payload: Types.GenerateReportRequest): Promise<Types.Report> {
    return request.post<Types.Report>(Endpoints.projects.reports.generate(projectId), payload);
  }

  // ─── Agent Report direct APIs ───────────────────────────────────────────────

  static async generateAgentReport(payload: Types.AgentReportGenerateRequest): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.reportGenerate, payload);
  }

  static async getAgentReportPdf(payload: { projectId: string; content: any }): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.reportPdf, payload);
  }

  static async exportAgentReportPdf(payload: { projectId: string; content: any }): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.reportExportPdf, payload);
  }
}
