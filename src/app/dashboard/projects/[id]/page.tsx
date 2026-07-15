/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProjectOverviewClient from "@/components/project/ProjectOverviewClient";

interface Props {
  params: { id: string };
}

export default async function ProjectOverviewPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { assets: true, findings: true, members: true, notes: true } },
      findings: {
        select: {
          id: true,
          type: true,
          severity: true,
          description: true,
          createdAt: true,
          asset: {
            select: {
              id: true,
              ip: true,
              hostname: true,
            }
          }
        }
      },
      timelineEntries: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: { select: { name: true } } },
      },
      scans: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      captureSession: true,
    },
  });

  if (!project) redirect("/dashboard");

  const findingCounts = project.findings.reduce(
    (acc, f) => { acc[f.severity] = (acc[f.severity] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const serializedScans = project.scans.map((s) => ({
    id:        s.id,
    target:    s.target,
    results:   s.results as any,
    createdAt: s.createdAt.toISOString(),
  }));

  const serializedTimeline = project.timelineEntries.map((e) => ({
    id:        e.id,
    action:    e.action,
    createdAt: e.createdAt.toISOString(),
    user:      e.user ? { name: e.user.name } : null,
  }));

  const serializedFindings = project.findings.map((f) => ({
    id:          f.id,
    type:        f.type,
    severity:    f.severity,
    description: f.description,
    createdAt:   f.createdAt.toISOString(),
    asset: f.asset ? {
      id:       f.asset.id,
      ip:       f.asset.ip,
      hostname: f.asset.hostname,
    } : null,
  }));

  const serializedSession = project.captureSession
    ? {
        id:                project.captureSession.id,
        projectId:         project.captureSession.projectId,
        alerts:            project.captureSession.alerts as any,
        iocs:              project.captureSession.iocs as any,
        timeline:          project.captureSession.timeline as any,
        mitre:             project.captureSession.mitre as any,
        riskRanking:       project.captureSession.riskRanking as any,
        attackStory:       project.captureSession.attackStory as any,
        investigationPlan: project.captureSession.investigationPlan as any,
        trafficIntelligence: project.captureSession.trafficIntelligence as any,
        findings:          (project.captureSession as any).findings as any,
        executiveReport:   project.captureSession.executiveReport,
        createdAt:         project.captureSession.createdAt.toISOString(),
        updatedAt:         project.captureSession.updatedAt.toISOString(),
      }
    : null;

  return (
    <ProjectOverviewClient
      projectId={params.id}
      projectName={project.name}
      description={project.description}
      assetsCount={project._count.assets}
      findingsCount={project._count.findings}
      membersCount={project._count.members}
      notesCount={project._count.notes}
      findingCounts={findingCounts}
      findings={serializedFindings}
      timelineEntries={serializedTimeline}
      scans={serializedScans}
      captureSession={serializedSession}
    />
  );
}
