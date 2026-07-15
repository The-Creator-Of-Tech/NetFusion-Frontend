import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Project name is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    });

    // Record timeline entry for project creation
    await prisma.timelineEntry.create({
      data: {
        projectId: project.id,
        userId: session.user.id,
        action: `Project "${project.name}" was created`,
        metadata: { model: "Project", operation: "create" },
      },
    });

    await track("project_created", { userId: session.user.id, projectId: project.id });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      include: {
        _count: {
          select: {
            assets: true,
            findings: true,
            members: true,
            notes: true,
            reports: true,
            scans: true,
          },
        },
        findings: {
          select: {
            id: true,
            severity: true,
            type: true,
            createdAt: true,
          },
        },
        timelineEntries: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: { select: { name: true } },
          },
        },
        captureSession: {
          select: {
            id: true,
            alerts: true,
            captureStatus: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

