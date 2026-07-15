import { request, agentRequest } from '../../api/request';
import { Endpoints } from '../../api/endpoints';

export class AiService {
  // ─── Platform Copilot ───────────────────────────────────────────────────────

  static async askCopilot(projectId: string, prompt: string, history: { role: string; content: string }[] = []): Promise<{ response: string }> {
    return request.post<{ response: string }>(Endpoints.projects.copilot.ask(projectId), {
      prompt,
      history,
    });
  }

  // ─── Agent AI APIs ──────────────────────────────────────────────────────────

  static async getDeviceProfile(payload: { ip: string; packets: any[]; pcapPath?: string }): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.aiDeviceProfile, payload);
  }

  static async getInvestigationPlan(payload: { findings: any[]; pcapPath?: string }): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.aiInvestigationPlan, payload);
  }

  static async getAttackStory(payload: { timeline: any[]; iocs: any[]; pcapPath?: string }): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.aiAttackStory, payload);
  }

  static async runAiInvestigation(payload: { target: string; context?: string }): Promise<any> {
    return agentRequest.post<any>(Endpoints.agent.aiInvestigate, payload);
  }
}
