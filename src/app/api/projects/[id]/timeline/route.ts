import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function guardProject(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!member;
}

// GET /api/projects/[id]/timeline
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entries = await prisma.timelineEntry.findMany({
    where: { projectId: params.id },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = entries.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
  }));

  return NextResponse.json({ entries: serialized });
}

// POST /api/projects/[id]/timeline  — manual observation
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

    const entry = await prisma.timelineEntry.create({
      data: {
        projectId: params.id,
        userId: session.user.id,
        action: text.trim(),
        metadata: { model: "Manual", operation: "observation" },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { entry: { ...entry, createdAt: entry.createdAt.toISOString() } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create timeline entry error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
