import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import { Role } from "@prisma/client";
import { track } from "@/lib/analytics";
import { TimelineService } from "@/lib/timeline";

const VALID_ROLES: Role[] = ["ANALYST", "VIEWER"];

// ── Guard: must be project owner ───────────────────────────────────────────────
async function guardOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  return project?.ownerId === userId;
}

// GET /api/projects/[id]/members
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await prisma.projectMember.findMany({
    where: { projectId: params.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });

  const pendingInvites = await prisma.invite.findMany({
    where: {
      projectId: params.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ members, pendingInvites });
}

// POST /api/projects/[id]/members  — send invite or add directly
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardOwner(params.id, session.user.id)))
    return NextResponse.json({ error: "Only the project owner can invite members" }, { status: 403 });

  try {
    const body = await req.json();
    const { email, role } = body as { email: string; role: string };

    if (!email?.trim() || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!VALID_ROLES.includes(role as Role)) {
      return NextResponse.json({ error: "Role must be ANALYST or VIEWER" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Check if already a member
      const alreadyMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: params.id, userId: existingUser.id } },
      });
      if (alreadyMember) {
        return NextResponse.json({ error: "This user is already a member" }, { status: 409 });
      }

      // Add directly
      const member = await prisma.projectMember.create({
        data: { projectId: params.id, userId: existingUser.id, role: role as Role },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      // Timeline
      await TimelineService.member(params.id, session.user.id, existingUser.name, role);

      await track("member_invited", { userId: session.user.id, projectId: params.id });

      return NextResponse.json({ member, invited: false }, { status: 201 });
    }

    // User doesn't exist — create invite
    // Delete any existing pending invite for this email+project
    await prisma.invite.deleteMany({
      where: { projectId: params.id, email: normalizedEmail, usedAt: null },
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.invite.create({
      data: {
        email: normalizedEmail,
        projectId: params.id,
        role: role as Role,
        expiresAt,
      },
      include: { project: { select: { name: true } } },
    });

    // Fetch inviter name
    const inviter = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite/${invite.token}`;

    await sendInviteEmail({
      to: normalizedEmail,
      projectName: invite.project.name,
      inviterName: inviter?.name ?? "A team member",
      role,
      inviteUrl,
    });

    await track("member_invited", { userId: session.user.id, projectId: params.id });

    return NextResponse.json(
      { invite: { id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt }, invited: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
