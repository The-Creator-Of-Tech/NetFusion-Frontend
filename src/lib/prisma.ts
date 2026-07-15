import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof buildPrismaClient> | undefined;
  prismaBase: PrismaClient | undefined;
};

// ── Raw base client (no extensions) — used for timeline writes ─────────────────
function getBaseClient() {
  if (!globalForPrisma.prismaBase) {
    globalForPrisma.prismaBase = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.prismaBase;
}

function buildPrismaClient() {
  const base = getBaseClient();

  // ── Timeline extension ─────────────────────────────────────────────────────
  // Records a TimelineEntry after every Asset or Finding create/update/delete.
  const client = base.$extends({
    query: {
      asset: {
        async create({ args, query }) {
          const result = await query(args);
          await recordTimeline("Asset", "create", result);
          return result;
        },
        async update({ args, query }) {
          const result = await query(args);
          await recordTimeline("Asset", "update", result);
          return result;
        },
        async delete({ args, query }) {
          const result = await query(args);
          await recordTimeline("Asset", "delete", result);
          return result;
        },
      },
      finding: {
        async create({ args, query }) {
          const result = await query(args);
          await recordTimeline("Finding", "create", result);
          return result;
        },
        async update({ args, query }) {
          const result = await query(args);
          await recordTimeline("Finding", "update", result);
          return result;
        },
        async delete({ args, query }) {
          const result = await query(args);
          await recordTimeline("Finding", "delete", result);
          return result;
        },
      },
    },
  });

  return client;
}

// ── Internal timeline recorder (no userId — system events) ────────────────────

async function recordTimeline(
  model: "Asset" | "Finding",
  operation: "create" | "update" | "delete",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any
) {
  try {
    let action = "";
    const projectId: string | undefined = record?.projectId;

    if (model === "Asset") {
      const label = record?.ip ?? record?.hostname ?? record?.id ?? "unknown";
      if (operation === "create") action = `Asset ${label} was added`;
      else if (operation === "update") action = `Asset ${label} was updated`;
      else action = `Asset ${label} was removed`;
    }

    if (model === "Finding") {
      const severity = record?.severity ?? "UNKNOWN";
      const type = record?.type ?? "Finding";
      if (operation === "create") action = `Finding [${severity}] ${type} was created`;
      else if (operation === "update") action = `Finding [${severity}] ${type} was updated`;
      else action = `Finding [${severity}] ${type} was removed`;
    }

    if (action && projectId) {
      await getBaseClient().timelineEntry.create({
        data: {
          action,
          projectId,
          metadata: { model, operation, recordId: record?.id },
        },
      });
    }
  } catch (err) {
    console.error("[Timeline error]", err);
  }
}

// ── Public helper — call from API routes to record events with userId ──────────

export async function addTimelineEvent(opts: {
  projectId: string;
  userId: string;
  action: string;
  model: "Asset" | "Finding" | "Note" | "Member" | "Manual";
  operation: "create" | "update" | "delete" | "observation";
  recordId?: string;
}) {
  try {
    await getBaseClient().timelineEntry.create({
      data: {
        projectId: opts.projectId,
        userId: opts.userId,
        action: opts.action,
        metadata: {
          model: opts.model,
          operation: opts.operation,
          ...(opts.recordId ? { recordId: opts.recordId } : {}),
        },
      },
    });
  } catch (err) {
    console.error("[addTimelineEvent error]", err);
  }
}

export const prisma = globalForPrisma.prisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
