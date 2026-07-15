import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, addTimelineEvent } from "@/lib/prisma";

// ── Auth guard: member OR owner ────────────────────────────────────────────────
async function guardProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      members: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  if (!project) return false;
  return project.ownerId === userId || project.members.length > 0;
}

// GET /api/projects/[id]/scans — list all scans for a project
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scans = await prisma.scan.findMany({    
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ scans });
}

// POST /api/projects/[id]/scans — save scan results
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("SCAN API HIT");
  console.log("Project:", params.id);

  const session = await auth();
  if (!session?.user?.id) {
    console.log("No session");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("User:", session.user.id);

  const allowed = await guardProject(params.id, session.user.id);
  console.log("Guard result:", allowed);

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    console.log("BODY target:", body.target, "ports:", body.results?.ports?.length ?? "?");

    if (!body.target || body.results === undefined) {
      return NextResponse.json(
        { error: "target and results are required" },
        { status: 400 }
      );
    }

    const scan = await prisma.scan.create({
      data: {
        target:    body.target,
        results:   body.results,
        projectId: params.id,
      },
    });

    // ── Step 1: Upsert asset ──────────────────────────────────────────────────
    let asset = await prisma.asset.findFirst({
      where: {
        projectId: params.id,
        hostname: body.target,
      },
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          type: "HOST",
          hostname: body.target,
          projectId: params.id,
        },
      });

      await addTimelineEvent({
        projectId: params.id,
        userId: session.user.id,
        action: `Asset ${body.target} was added`,
        model: "Asset",
        operation: "create",
      });
    }

    // ── Step 2: Port risk rules ───────────────────────────────────────────────
    const PORT_RISKS: Record<number, { severity: any; type: string }> = {
      21:   { severity: "HIGH",     type: "FTP Exposed" },
      22: { severity: "INFO", type: "SSH Exposed" },
      23:   { severity: "CRITICAL", type: "Telnet Exposed" },
      445:  { severity: "HIGH",     type: "SMB Exposed" },
      3389: { severity: "MEDIUM",   type: "RDP Exposed" },
      5900: { severity: "MEDIUM",   type: "VNC Exposed" },

    };

    // ── Step 3: Auto-create findings for risky ports ──────────────────────────
    for (const port of body.results.ports || []) {
      const risk = PORT_RISKS[port.port];

      if (!risk) continue;

      const existingFinding = await prisma.finding.findFirst({
        where: {
          assetId: asset.id,
          type: risk.type,
        },
      });

      if (existingFinding) continue;

      await prisma.finding.create({
        data: {
          type:        risk.type,
          severity:    risk.severity,
          description: `${risk.type} detected on port ${port.port}`,
          assetId:     asset.id,
          projectId:   params.id,
        },
      });
    }

    console.log("SCAN CREATED:", scan.id);

    await addTimelineEvent({
      projectId:  params.id,
      userId:     session.user.id,
      action:     `Network scan executed against ${body.target}`,
      model:      "Manual",
      operation:  "observation",
      recordId:   scan.id,
    });

    return NextResponse.json({ scan }, { status: 201 });
  } catch (error) {
    console.error("Scan save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
