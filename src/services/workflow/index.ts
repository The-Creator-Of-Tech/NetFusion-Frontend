import { request } from '../../api/request';
import { Endpoints } from '../../api/endpoints';
import * as Types from '../../types/api';

export class WorkflowService {
  // ─── Authentication ────────────────────────────────────────────────────────

  static async register(payload: Types.RegisterRequest): Promise<Types.User> {
    return request.post<Types.User>(Endpoints.auth.register, payload);
  }

  // ─── Projects ──────────────────────────────────────────────────────────────

  static async createProject(payload: Types.CreateProjectRequest): Promise<Types.Project> {
    return request.post<Types.Project>(Endpoints.projects.create, payload);
  }

  static async getProject(projectId: string): Promise<Types.Project> {
    return request.get<Types.Project>(Endpoints.projects.get(projectId));
  }

  // ─── Invitations ───────────────────────────────────────────────────────────

  static async getInvite(token: string): Promise<Types.Invite> {
    return request.get<Types.Invite>(Endpoints.invite.byToken(token));
  }

  static async acceptInvite(token: string): Promise<any> {
    return request.post<any>(Endpoints.invite.byToken(token), {});
  }

  // ─── Team Management ───────────────────────────────────────────────────────

  static async getMembers(projectId: string): Promise<Types.ProjectMember[]> {
    return request.get<Types.ProjectMember[]>(Endpoints.projects.members.list(projectId));
  }

  static async inviteMember(projectId: string, payload: Types.InviteMemberRequest): Promise<Types.Invite> {
    return request.post<Types.Invite>(Endpoints.projects.members.create(projectId), payload);
  }

  static async updateMember(projectId: string, memberId: string, payload: Types.UpdateMemberRequest): Promise<Types.ProjectMember> {
    return request.patch<Types.ProjectMember>(Endpoints.projects.members.update(projectId, memberId), payload);
  }

  static async deleteMember(projectId: string, memberId: string): Promise<void> {
    return request.delete<void>(Endpoints.projects.members.delete(projectId, memberId));
  }

  static async cancelInvite(projectId: string, inviteId: string): Promise<void> {
    return request.delete<void>(Endpoints.projects.members.deleteInvite(projectId, inviteId));
  }
}
