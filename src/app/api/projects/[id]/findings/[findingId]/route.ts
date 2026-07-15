import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, addTimelineEvent } from "@/lib/prisma";
import { Severity } from "@prisma/client";

async function guardProject(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!member;
}

const VALID_SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

// PUT /api/projects/[id]/findings/[findingId]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; findingId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { assetId, type, severity, description } = body;

    if (severity && !VALID_SEVERITIES.includes(severity as Severity)) {
      return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
    }

    const finding = await prisma.finding.update({
      where: { id: params.findingId },
      data: {
        ...(assetId && { assetId }),
        ...(type && { type: type.trim() }),
        ...(severity && { severity: severity as Severity }),
        ...(description && { description: description.trim() }),
      },
      include: {
        asset: { select: { id: true, ip: true, hostname: true, type: true } },
      },
    });

    // Timeline
    await addTimelineEvent({
      projectId: params.id,
      userId: session.user.id,
      action: `Finding [${finding.severity}] ${finding.type} was updated`,
      model: "Finding",
      operation: "update",
      recordId: finding.id,
    });

    return NextResponse.json({ finding });
  } catch (error) {
    console.error("Update finding error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/findings/[findingId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; findingId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await prisma.finding.delete({ where: { id: params.findingId } });

    // Timeline
    await addTimelineEvent({
      projectId: params.id,
      userId: session.user.id,
      action: `A finding was removed`,
      model: "Finding",
      operation: "delete",
      recordId: params.findingId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete finding error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
