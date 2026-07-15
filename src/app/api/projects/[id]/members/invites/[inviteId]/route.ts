import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function guardOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  return project?.ownerId === userId;
}

// DELETE /api/projects/[id]/members/invites/[inviteId]  — revoke pending invite
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; inviteId: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardOwner(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await prisma.invite.delete({ where: { id: params.inviteId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
}
