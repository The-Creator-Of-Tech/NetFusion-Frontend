import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, addTimelineEvent } from "@/lib/prisma";

// ── Auth + membership guard ────────────────────────────────────────────────────
async function guardProject(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!member;
}

// GET /api/projects/[id]/assets
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assets = await prisma.asset.findMany({
    where: { projectId: params.id },
    include: { _count: { select: { findings: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ assets });
}

// POST /api/projects/[id]/assets
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
    const { ip, hostname, type, tags, notes } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Asset type is required" },
        { status: 400 }
      );
    }

    // Parse tags: accept array or comma-separated string
    const parsedTags: string[] = Array.isArray(tags)
      ? tags.map((t: string) => t.trim()).filter(Boolean)
      : typeof tags === "string"
      ? tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const asset = await prisma.asset.create({
      data: {
        projectId: params.id,
        ip: ip?.trim() || null,
        hostname: hostname?.trim() || null,
        type: type.trim(),
        tags: parsedTags,
        notes: notes?.trim() || null,
      },
      include: { _count: { select: { findings: true } } },
    });

    // Timeline
    const label = asset.ip ?? asset.hostname ?? asset.id;
    await addTimelineEvent({
      projectId: params.id,
      userId: session.user.id,
      action: `Asset ${label} was added`,
      model: "Asset",
      operation: "create",
      recordId: asset.id,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error("Create asset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
