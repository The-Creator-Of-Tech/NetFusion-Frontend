/**
 * TimelineService — single write path for ALL timeline events.
 *
 * Every module (Workflow, Nmap, AI, IOC, Cases, Investigations, Assets,
 * Findings, Notes, Members) must go through this service.  The Timeline API
 * route and Timeline page read exclusively from the TimelineEntry table.
 *
 * Unified event schema
 * ────────────────────
 * eventId         – UUID (auto-generated, stored as TimelineEntry.id)
 * projectId       – required
 * executionId     – optional: workflow/playbook/automation run id
 * investigationId – optional: case / investigation id
 * source          – module tag: "workflow"|"nmap"|"ai"|"ioc"|"asset"|
 *                               "finding"|"note"|"member"|"manual"|"capture"
 * title           – short headline (≤80 chars)
 * description     – full human-readable sentence (stored as `action`)
 * severity        – optional: "CRITICAL"|"HIGH"|"MEDIUM"|"LOW"|"INFO"
 * createdAt       – auto-set by DB default
 * metadata        – arbitrary JSON (model, operation, recordId, etc.)
 */

import { PrismaClient, Prisma } from "@prisma/client";

// ── Shared base client (no $extends, no middleware) ───────────────────────────
const globalForPrisma = globalThis as unknown as {
  _timelineBase: PrismaClient | undefined;
};

function getBaseClient(): PrismaClient {
  if (!globalForPrisma._timelineBase) {
    globalForPrisma._timelineBase = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return globalForPrisma._timelineBase;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type TimelineSource =
  | "workflow"
  | "nmap"
  | "ai"
  | "ioc"
  | "asset"
  | "finding"
  | "note"
  | "member"
  | "manual"
  | "capture"
  | "system";

export interface TimelineEventInput {
  projectId: string;
  /** Authenticated user who triggered the event; omit for system events */
  userId?: string;
  /** Module that produced this event */
  source: TimelineSource;
  /** Short headline shown in the timeline card header (≤80 chars) */
  title?: string;
  /** Full description / action sentence */
  description: string;
  /** Optional severity level */
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  /** Workflow execution / playbook run / automation ID */
  executionId?: string;
  /** Case / investigation ID */
  investigationId?: string;
  /** Free-form JSON for additional context */
  metadata?: Record<string, unknown>;
}

// ── Core write ────────────────────────────────────────────────────────────────

export async function createTimelineEvent(
  input: TimelineEventInput
): Promise<void> {
  try {
    await getBaseClient().timelineEntry.create({
      data: {
        projectId:       input.projectId,
        userId:          input.userId ?? null,
        source:          input.source,
        title:           input.title ?? null,
        action:          input.description,           // legacy `action` field kept for compat
        severity:        input.severity ?? null,
        executionId:     input.executionId ?? null,
        investigationId: input.investigationId ?? null,
        metadata:        input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  } catch (err) {
    // Timeline writes must never crash the caller
    console.error("[TimelineService] write error:", err);
  }
}

// ── Convenience helpers ───────────────────────────────────────────────────────

export const TimelineService = {
  /** Asset created / updated / deleted */
  asset(
    projectId: string,
    userId: string,
    operation: "create" | "update" | "delete",
    label: string,
    recordId?: string
  ) {
    const verb =
      operation === "create" ? "added" : operation === "update" ? "updated" : "removed";
    return createTimelineEvent({
      projectId,
      userId,
      source: "asset",
      title: `Asset ${verb}`,
      description: `Asset ${label} was ${verb}`,
      metadata: { model: "Asset", operation, recordId },
    });
  },

  /** Finding created / updated / deleted */
  finding(
    projectId: string,
    userId: string,
    operation: "create" | "update" | "delete",
    type: string,
    severity: string,
    recordId?: string
  ) {
    const verb =
      operation === "create" ? "created" : operation === "update" ? "updated" : "removed";
    return createTimelineEvent({
      projectId,
      userId,
      source: "finding",
      title: `Finding ${verb}`,
      description:
        operation === "delete"
          ? "A finding was removed"
          : `Finding [${severity}] ${type} was ${verb}`,
      severity: severity as TimelineEventInput["severity"],
      metadata: { model: "Finding", operation, recordId },
    });
  },

  /** Investigation notes created / updated */
  note(
    projectId: string,
    userId: string,
    operation: "create" | "update",
    recordId?: string
  ) {
    const verb = operation === "create" ? "created" : "updated";
    return createTimelineEvent({
      projectId,
      userId,
      source: "note",
      title: `Investigation notes ${verb}`,
      description: `Investigation notes were ${verb}`,
      metadata: { model: "Note", operation, recordId },
    });
  },

  /** Member joined the project */
  member(
    projectId: string,
    actorUserId: string,
    memberName: string,
    role: string
  ) {
    return createTimelineEvent({
      projectId,
      userId: actorUserId,
      source: "member",
      title: "Member added",
      description: `${memberName} joined as ${role}`,
      metadata: { model: "Member", operation: "create" },
    });
  },

  /** Nmap scan executed */
  nmap(
    projectId: string,
    userId: string,
    target: string,
    scanId?: string
  ) {
    return createTimelineEvent({
      projectId,
      userId,
      source: "nmap",
      title: "Network scan executed",
      description: `Network scan executed against ${target}`,
      metadata: { model: "Scan", operation: "create", recordId: scanId },
    });
  },

  /** Playbook / workflow execution started */
  workflowStarted(
    projectId: string,
    userId: string,
    playbookName: string,
    executionId: string
  ) {
    return createTimelineEvent({
      projectId,
      userId,
      source: "workflow",
      title: "Playbook started",
      description: `Playbook "${playbookName}" execution started`,
      executionId,
      metadata: { model: "Playbook", operation: "execute", executionId },
    });
  },

  /** Playbook / workflow execution completed */
  workflowCompleted(
    projectId: string,
    playbookName: string,
    executionId: string,
    success: boolean,
    durationMs?: number
  ) {
    const status = success ? "completed successfully" : "failed";
    return createTimelineEvent({
      projectId,
      source: "workflow",
      title: `Playbook ${status}`,
      description: `Playbook "${playbookName}" ${status}${durationMs ? ` in ${Math.round(durationMs / 1000)}s` : ""}`,
      severity: success ? undefined : "HIGH",
      executionId,
      metadata: { model: "Playbook", operation: "complete", executionId, success, durationMs },
    });
  },

  /** Case / investigation created */
  caseCreated(
    projectId: string,
    userId: string,
    caseTitle: string,
    investigationId: string,
    priority: string
  ) {
    return createTimelineEvent({
      projectId,
      userId,
      source: "workflow",
      title: "Case created",
      description: `Case "${caseTitle}" was created (priority: ${priority})`,
      investigationId,
      metadata: { model: "Case", operation: "create", investigationId, priority },
    });
  },

  /** Case status changed */
  caseStatusChanged(
    projectId: string,
    userId: string,
    caseTitle: string,
    investigationId: string,
    newStatus: string
  ) {
    return createTimelineEvent({
      projectId,
      userId,
      source: "workflow",
      title: "Case updated",
      description: `Case "${caseTitle}" status changed to ${newStatus}`,
      investigationId,
      metadata: { model: "Case", operation: "update", investigationId, status: newStatus },
    });
  },

  /** Automation triggered */
  automationTriggered(
    projectId: string,
    userId: string,
    automationName: string,
    trigger: string,
    executionId: string
  ) {
    return createTimelineEvent({
      projectId,
      userId,
      source: "workflow",
      title: "Automation triggered",
      description: `Automation "${automationName}" triggered by ${trigger}`,
      executionId,
      metadata: { model: "Automation", operation: "trigger", executionId, trigger },
    });
  },

  /** Manual analyst observation */
  observation(
    projectId: string,
    userId: string,
    text: string
  ) {
    return createTimelineEvent({
      projectId,
      userId,
      source: "manual",
      title: "Observation",
      description: text,
      metadata: { model: "Manual", operation: "observation" },
    });
  },

  /** AI copilot analysis run */
  aiAnalysis(
    projectId: string,
    userId: string,
    description: string,
    metadata?: Record<string, unknown>
  ) {
    return createTimelineEvent({
      projectId,
      userId,
      source: "ai",
      title: "AI analysis",
      description,
      metadata: { model: "AI", operation: "analyze", ...metadata },
    });
  },

  /** IOC / threat indicator event */
  ioc(
    projectId: string,
    description: string,
    severity?: TimelineEventInput["severity"],
    metadata?: Record<string, unknown>
  ) {
    return createTimelineEvent({
      projectId,
      source: "ioc",
      title: "IOC detected",
      description,
      severity,
      metadata: { model: "IOC", ...metadata },
    });
  },
};
