import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TimelineService } from "@/lib/timeline";

async function guardProject(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!member;
}

// GET /api/projects/[id]/timeline — unified timeline feed
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.timelineEntry.findMany({
    where: { projectId: params.id },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Normalise to unified schema — handle rows written before the migration
  const entries = rows.map((e) => {
    const meta = e.metadata as Record<string, unknown> | null;
    return {
      // Unified schema
      eventId:         e.id,
      projectId:       e.projectId,
      executionId:     (e as any).executionId ?? meta?.executionId ?? null,
      investigationId: (e as any).investigationId ?? meta?.investigationId ?? null,
      source:          (e as any).source ?? deriveSource(meta),
      title:           (e as any).title ?? deriveTitleFromAction(e.action),
      description:     e.action,
      severity:        (e as any).severity ?? null,
      createdAt:       e.createdAt.toISOString(),
      metadata:        meta,
      user:            e.user,
      // Legacy fields kept for backwards-compat with existing client code
      id:              e.id,
      action:          e.action,
    };
  });

  return NextResponse.json({ entries });
}

// POST /api/projects/[id]/timeline — manual analyst observation
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { text } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: "Observation text is required" }, { status: 400 });
    }

    await TimelineService.observation(params.id, session.user.id, text.trim());

    // Fetch the just-created entry to return it
    const entry = await prisma.timelineEntry.findFirst({
      where: { projectId: params.id, userId: session.user.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (!entry) {
      return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
    }

    const meta = entry.metadata as Record<string, unknown> | null;
    const normalized = {
      eventId:         entry.id,
      projectId:       entry.projectId,
      executionId:     null,
      investigationId: null,
      source:          "manual",
      title:           "Observation",
      description:     entry.action,
      severity:        null,
      createdAt:       entry.createdAt.toISOString(),
      metadata:        meta,
      user:            entry.user,
      // Legacy compat
      id:              entry.id,
      action:          entry.action,
    };

    return NextResponse.json({ entry: normalized }, { status: 201 });
  } catch (error) {
    console.error("Create timeline entry error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Helpers to back-fill legacy rows ─────────────────────────────────────────

function deriveSource(meta: Record<string, unknown> | null): string {
  const model = ((meta?.model as string) ?? "").toLowerCase();
  const map: Record<string, string> = {
    asset: "asset", finding: "finding", note: "note",
    member: "member", manual: "manual", scan: "nmap",
    ai: "ai", ioc: "ioc", capture: "capture",
    playbook: "workflow", automation: "workflow", case: "workflow",
  };
  return map[model] ?? "system";
}

function deriveTitleFromAction(action: string): string {
  if (!action) return "Event";
  // Truncate to 80 chars
  return action.length > 80 ? action.slice(0, 77) + "…" : action;
}
