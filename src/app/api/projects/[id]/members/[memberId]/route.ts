import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const VALID_ROLES: Role[] = ["ANALYST", "VIEWER"];

async function guardOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  return project?.ownerId === userId;
}

// PATCH /api/projects/[id]/members/[memberId]  — change role
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardOwner(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { role } = await req.json();

    if (!VALID_ROLES.includes(role as Role)) {
      return NextResponse.json({ error: "Role must be ANALYST or VIEWER" }, { status: 400 });
    }

    const member = await prisma.projectMember.update({
      where: { id: params.memberId },
      data: { role: role as Role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await prisma.timelineEntry.create({
      data: {
        projectId: params.id,
        userId: session.user.id,
        action: `${member.user.name}'s role changed to ${role}`,
        metadata: { model: "Member", operation: "update" },
      },
    });

    return NextResponse.json({ member });
  } catch (error) {
    console.error("Role change error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/members/[memberId]  — remove member
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardOwner(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const member = await prisma.projectMember.findUnique({
      where: { id: params.memberId },
      include: { user: { select: { name: true } } },
    });

    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Cannot remove the owner
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { ownerId: true },
    });
    if (member.userId === project?.ownerId) {
      return NextResponse.json({ error: "Cannot remove the project owner" }, { status: 400 });
    }

    await prisma.projectMember.delete({ where: { id: params.memberId } });

    await prisma.timelineEntry.create({
      data: {
        projectId: params.id,
        userId: session.user.id,
        action: `${member.user.name} was removed from the project`,
        metadata: { model: "Member", operation: "delete" },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
