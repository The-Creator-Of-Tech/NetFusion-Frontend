import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, addTimelineEvent } from "@/lib/prisma";

async function guardProject(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!member;
}

// PUT /api/projects/[id]/assets/[assetId]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; assetId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { ip, hostname, type, tags, notes } = body;

    const parsedTags: string[] = Array.isArray(tags)
      ? tags.map((t: string) => t.trim()).filter(Boolean)
      : typeof tags === "string"
      ? tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const asset = await prisma.asset.update({
      where: { id: params.assetId },
      data: {
        ip: ip?.trim() || null,
        hostname: hostname?.trim() || null,
        type: type?.trim(),
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
      action: `Asset ${label} was updated`,
      model: "Asset",
      operation: "update",
      recordId: asset.id,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Update asset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/assets/[assetId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; assetId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await prisma.asset.delete({ where: { id: params.assetId } });

    // Timeline — fetch label before delete isn't possible here, use id
    await addTimelineEvent({
      projectId: params.id,
      userId: session.user.id,
      action: `Asset was removed`,
      model: "Asset",
      operation: "delete",
      recordId: params.assetId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete asset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/projects/[id]/assets/[assetId] — full detail with findings
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; assetId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const asset = await prisma.asset.findUnique({
    where: { id: params.assetId },
    include: {
      findings: { orderBy: { createdAt: "desc" } },
      _count: { select: { findings: true } },
    },
  });

  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ asset });
}
