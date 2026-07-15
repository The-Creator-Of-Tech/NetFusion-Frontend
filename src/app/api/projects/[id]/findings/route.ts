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

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

// GET /api/projects/[id]/findings?severity=CRITICAL
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const severityFilter = searchParams.get("severity") as Severity | null;

  const findings = await prisma.finding.findMany({
    where: {
      projectId: params.id,
      ...(severityFilter && SEVERITY_ORDER.includes(severityFilter)
        ? { severity: severityFilter }
        : {}),
    },
    include: {
      asset: { select: { id: true, ip: true, hostname: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Sort by severity order client-side after fetch
  const sorted = findings.sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return NextResponse.json({ findings: sorted });
}

// POST /api/projects/[id]/findings
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
    const { assetId, type, severity, description } = body;

    if (!assetId || !type || !severity || !description) {
      return NextResponse.json(
        { error: "assetId, type, severity, and description are required" },
        { status: 400 }
      );
    }

    if (!SEVERITY_ORDER.includes(severity as Severity)) {
      return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
    }

    const finding = await prisma.finding.create({
      data: {
        projectId: params.id,
        assetId,
        type: type.trim(),
        severity: severity as Severity,
        description: description.trim(),
      },
      include: {
        asset: { select: { id: true, ip: true, hostname: true, type: true } },
      },
    });

    // Timeline
    await addTimelineEvent({
      projectId: params.id,
      userId: session.user.id,
      action: `Finding [${severity}] ${type.trim()} was created`,
      model: "Finding",
      operation: "create",
      recordId: finding.id,
    });

    return NextResponse.json({ finding }, { status: 201 });
  } catch (error) {
    console.error("Create finding error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
