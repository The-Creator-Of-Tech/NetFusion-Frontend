import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/invite/[token]  — validate token (used by the invite page to show info)
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const invite = await prisma.invite.findUnique({
    where: { token: params.token },
    include: { project: { select: { id: true, name: true } } },
  });

  if (!invite) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: "Invitation already used" }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invitation expired" }, { status: 410 });

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    projectName: invite.project.name,
    projectId: invite.project.id,
  });
}

// POST /api/invite/[token]  — accept invite (create account if needed + add membership)
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invite = await prisma.invite.findUnique({
      where: { token: params.token },
      include: { project: { select: { id: true, name: true } } },
    });

    if (!invite) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
    if (invite.usedAt) return NextResponse.json({ error: "Invitation already used" }, { status: 410 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invitation expired" }, { status: 410 });

    const body = await req.json();
    const { name, password } = body as { name?: string; password?: string };

    let userId: string;

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email: invite.email } });

    if (user) {
      // Existing user — just add membership
      userId = user.id;
    } else {
      // New user — require name + password
      if (!name?.trim() || !password || password.length < 8) {
        return NextResponse.json(
          { error: "Name and a password of at least 8 characters are required to create your account" },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(password, 12);
      user = await prisma.user.create({
        data: { email: invite.email, name: name.trim(), passwordHash },
      });
      userId = user.id;
    }

    // Add as project member (upsert in case of race)
    const alreadyMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: invite.projectId, userId } },
    });

    if (!alreadyMember) {
      await prisma.projectMember.create({
        data: { projectId: invite.projectId, userId, role: invite.role },
      });

      await prisma.timelineEntry.create({
        data: {
          projectId: invite.projectId,
          userId,
          action: `${user.name} joined as ${invite.role}`,
          metadata: { model: "Member", operation: "create" },
        },
      });
    }

    // Mark invite as used
    await prisma.invite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      projectId: invite.projectId,
      isNewUser: !alreadyMember && !user,
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
