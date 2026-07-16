import { PrismaClient } from "@prisma/client";
import { createTimelineEvent, TimelineSource } from "./timeline";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Single shared PrismaClient — no $extends middleware.
// Timeline events are written through TimelineService (src/lib/timeline.ts)
// to avoid double-writes that the old $extends extension caused.
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ── Compatibility shim ────────────────────────────────────────────────────────
// Existing routes call addTimelineEvent(). They all work unchanged while we
// migrate them incrementally to TimelineService directly.

const MODEL_TO_SOURCE: Record<string, TimelineSource> = {
  Asset:   "asset",
  Finding: "finding",
  Note:    "note",
  Member:  "member",
  Manual:  "manual",
  Scan:    "nmap",
  AI:      "ai",
  IOC:     "ioc",
  Capture: "capture",
};

export async function addTimelineEvent(opts: {
  projectId: string;
  userId: string;
  action: string;
  model: "Asset" | "Finding" | "Note" | "Member" | "Manual" | "Scan" | "AI" | "IOC" | "Capture";
  operation: "create" | "update" | "delete" | "observation" | "execute" | "analyze";
  recordId?: string;
}) {
  await createTimelineEvent({
    projectId:   opts.projectId,
    userId:      opts.userId,
    source:      MODEL_TO_SOURCE[opts.model] ?? "system",
    description: opts.action,
    metadata: {
      model:     opts.model,
      operation: opts.operation,
      ...(opts.recordId ? { recordId: opts.recordId } : {}),
    },
  });
}
