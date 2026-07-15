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

// GET /api/projects/[id]/notes
// Returns the single project note document (upsert model — one note per project)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const note = await prisma.note.findFirst({
    where: { projectId: params.id },
    include: {
      author: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ note });
}

// PUT /api/projects/[id]/notes  (upsert — create or update the single note)
export async function PUT(
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
    const { content } = body;

    if (typeof content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    // Find existing note for this project
    const existing = await prisma.note.findFirst({
      where: { projectId: params.id },
    });

    let note;
    if (existing) {
      note = await prisma.note.update({
        where: { id: existing.id },
        data: {
          content,
          authorId: session.user.id, // track last editor
        },
        include: {
          author: { select: { id: true, name: true } },
        },
      });
    } else {
      note = await prisma.note.create({
        data: {
          projectId: params.id,
          authorId: session.user.id,
          content,
        },
        include: {
          author: { select: { id: true, name: true } },
        },
      });
    }

    // Timeline — only record on first create or throttle to avoid spam on auto-save
    // We record every explicit save; auto-save debounce is handled client-side
    await addTimelineEvent({
      projectId: params.id,
      userId: session.user.id,
      action: existing ? "Investigation notes were updated" : "Investigation notes were created",
      model: "Note",
      operation: existing ? "update" : "create",
      recordId: note.id,
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Upsert note error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
