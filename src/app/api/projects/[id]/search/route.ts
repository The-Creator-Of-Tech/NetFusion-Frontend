import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function guardProject(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!member;
}

// GET /api/projects/[id]/search
// Returns all searchable data for the project in one shot (client-side filtering).
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [assets, findings, note] = await Promise.all([
    prisma.asset.findMany({
      where: { projectId: params.id },
      select: {
        id: true,
        ip: true,
        hostname: true,
        type: true,
        tags: true,
        notes: true,
      },
    }),
    prisma.finding.findMany({
      where: { projectId: params.id },
      select: {
        id: true,
        type: true,
        severity: true,
        description: true,
      },
    }),
    prisma.note.findFirst({
      where: { projectId: params.id },
      select: { id: true, content: true },
    }),
  ]);

  return NextResponse.json({ assets, findings, note });
}
