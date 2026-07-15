import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function guardProject(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!member;
}

// GET /api/projects/[id]/reports
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const reports = await prisma.report.findMany({
    where: { projectId: params.id },
    include: {
      generatedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      id:            r.id,
      title:         r.title,
      riskLevel:     r.riskLevel,
      sections:      r.sections as string[],
      createdAt:     r.createdAt.toISOString(),
      generatedBy:   r.generatedBy.name,
    })),
  });
}
