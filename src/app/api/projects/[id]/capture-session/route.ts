import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await guardProject(params.id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const captureSession = await prisma.captureSession.findUnique({
      where: { projectId: params.id },
    });

    if (captureSession) {
      const trafficIntel = (captureSession.trafficIntelligence as any) || {};
      const mappedSession = {
        ...captureSession,
        total_packets: trafficIntel.total_packets ?? null,
        protocols: trafficIntel.protocols ?? null,
        conversations: trafficIntel.conversations ?? null,
        conversation_count: trafficIntel.conversation_count ?? null,
        top_sources: trafficIntel.top_sources ?? null,
        top_destinations: trafficIntel.top_destinations ?? null,
        packets: trafficIntel.packets ?? null,
        // Ensure lifecycle fields are always present in response
        captureStatus: captureSession.captureStatus ?? "idle",
        captureComplete: captureSession.captureComplete ?? false,
        captureStartedAt: captureSession.captureStartedAt ?? null,
        captureStoppedAt: captureSession.captureStoppedAt ?? null,
      };
      return NextResponse.json({ session: mappedSession });
    }

    return NextResponse.json({ session: captureSession });
  } catch (error) {
    console.error("Failed to get capture session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await guardProject(params.id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      alerts,
      iocs,
      timeline,
      mitre,
      riskRanking,
      attackStory,
      investigationPlan,
      executiveReport,
      trafficIntelligence,
      findings,
      // Capture lifecycle fields
      captureStatus,
      captureComplete,
      captureStartedAt,
      captureStoppedAt,
      // Root level fields sent by frontend
      total_packets,
      protocols,
      conversations,
      conversation_count,
      top_sources,
      top_destinations,
      packets,
    } = body;

    // Prepare updated trafficIntelligence object with analysis result fields merged
    const existingSession = await prisma.captureSession.findUnique({
      where: { projectId: params.id },
    });
    const oldTrafficIntel = (existingSession?.trafficIntelligence as any) || {};

    const updatedTrafficIntel = {
      ...(trafficIntelligence !== undefined ? trafficIntelligence : oldTrafficIntel),
      total_packets: total_packets !== undefined ? total_packets : oldTrafficIntel.total_packets,
      protocols: protocols !== undefined ? protocols : oldTrafficIntel.protocols,
      conversations: conversations !== undefined ? conversations : oldTrafficIntel.conversations,
      conversation_count: conversation_count !== undefined ? conversation_count : oldTrafficIntel.conversation_count,
      top_sources: top_sources !== undefined ? top_sources : oldTrafficIntel.top_sources,
      top_destinations: top_destinations !== undefined ? top_destinations : oldTrafficIntel.top_destinations,
      packets: packets !== undefined ? packets : oldTrafficIntel.packets,
    };

    const captureSession = await prisma.captureSession.upsert({
      where: { projectId: params.id },
      update: {
        alerts: alerts !== undefined ? alerts : undefined,
        iocs: iocs !== undefined ? iocs : undefined,
        timeline: timeline !== undefined ? timeline : undefined,
        mitre: mitre !== undefined ? mitre : undefined,
        riskRanking: riskRanking !== undefined ? riskRanking : undefined,
        attackStory: attackStory !== undefined ? attackStory : undefined,
        investigationPlan: investigationPlan !== undefined ? investigationPlan : undefined,
        executiveReport: executiveReport !== undefined ? executiveReport : undefined,
        trafficIntelligence: updatedTrafficIntel,
        findings: findings !== undefined ? findings : undefined,
        captureStatus: captureStatus !== undefined ? captureStatus : undefined,
        captureComplete: captureComplete !== undefined ? captureComplete : undefined,
        captureStartedAt: captureStartedAt !== undefined ? (captureStartedAt ? new Date(captureStartedAt) : null) : undefined,
        captureStoppedAt: captureStoppedAt !== undefined ? (captureStoppedAt ? new Date(captureStoppedAt) : null) : undefined,
      },
      create: {
        projectId: params.id,
        alerts: alerts ?? [],
        iocs: iocs ?? [],
        timeline: timeline ?? [],
        mitre: mitre ?? [],
        riskRanking: riskRanking ?? [],
        attackStory: attackStory ?? null,
        investigationPlan: investigationPlan ?? null,
        executiveReport: executiveReport ?? "",
        trafficIntelligence: updatedTrafficIntel,
        findings: findings ?? null,
        captureStatus: captureStatus ?? "idle",
        captureComplete: captureComplete ?? false,
        captureStartedAt: captureStartedAt ? new Date(captureStartedAt) : null,
        captureStoppedAt: captureStoppedAt ? new Date(captureStoppedAt) : null,
      },
    });

    // Return the mapped session (with fields at root) to match the GET response
    const trafficIntelObj = (captureSession.trafficIntelligence as any) || {};
    const mappedSession = {
      ...captureSession,
      total_packets: trafficIntelObj.total_packets ?? null,
      protocols: trafficIntelObj.protocols ?? null,
      conversations: trafficIntelObj.conversations ?? null,
      conversation_count: trafficIntelObj.conversation_count ?? null,
      top_sources: trafficIntelObj.top_sources ?? null,
      top_destinations: trafficIntelObj.top_destinations ?? null,
      packets: trafficIntelObj.packets ?? null,
      captureStatus: captureSession.captureStatus ?? "idle",
      captureComplete: captureSession.captureComplete ?? false,
      captureStartedAt: captureSession.captureStartedAt ?? null,
      captureStoppedAt: captureSession.captureStoppedAt ?? null,
    };

    return NextResponse.json({ session: mappedSession });
  } catch (error) {
    console.error("Failed to save capture session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await guardProject(params.id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.captureSession.delete({
      where: { projectId: params.id },
    }).catch(() => {}); // ignore if it doesn't exist

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete capture session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
