import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProjectShell from "@/components/project/ProjectShell";

interface Props {
  children: React.ReactNode;
  params: { id: string };
}

export default async function ProjectLayout({ children, params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Fetch project + membership check + statistics in one query
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: { select: { assets: true, findings: true } },
      findings: { select: { severity: true } },
      captureSession: true,
    },
  });

  // Project doesn't exist → 404-style redirect
  if (!project) redirect("/dashboard?error=not_found");

  // Calculate statistics for Top Header Redesign
  const findingCounts = project.findings.reduce(
    (acc, f) => { acc[f.severity] = (acc[f.severity] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const weights = { CRITICAL: 25, HIGH: 15, MEDIUM: 8, LOW: 3, INFO: 0 };
  const rawRiskScore = Object.entries(findingCounts).reduce((sum, [sev, count]) => {
    const weight = weights[sev as keyof typeof weights] ?? 0;
    return sum + (count * weight);
  }, 0);
  const riskScore = Math.min(100, rawRiskScore);

  let riskLevel = "No Risk";
  if (riskScore > 75) riskLevel = "CRITICAL";
  else if (riskScore > 40) riskLevel = "HIGH";
  else if (riskScore > 15) riskLevel = "MEDIUM";
  else if (riskScore > 0) riskLevel = "LOW";

  const criticalFindingsCount = findingCounts.CRITICAL ?? 0;

  const alertsCount = Array.isArray(project.captureSession?.alerts)
    ? project.captureSession.alerts.length
    : (project.captureSession?.alerts ? Object.keys(project.captureSession.alerts as object).length : 0);

  const lastActivityDate = project.captureSession?.updatedAt ?? project.updatedAt;

  // Access control: must be owner or member
  const isMember = project.members.some((m) => m.userId === session.user.id);
  const isOwner = project.ownerId === session.user.id;

  if (!isMember && !isOwner) {
    redirect("/dashboard?error=access_denied");
  }

  // Current user's role in this project
  const membership = project.members.find((m) => m.userId === session.user.id);
  const projectRole = membership?.role ?? "VIEWER";

  return (
    <ProjectShell
      project={{ id: project.id, name: project.name, description: project.description }}
      members={project.members.map((m) => ({
        id: m.id,
        role: m.role,
        user: m.user,
      }))}
      currentUser={{
        id: session.user.id,
        name: session.user.name ?? "",
        role: session.user.role ?? "ANALYST",
        projectRole,
      }}
      stats={{
        riskScore,
        riskLevel,
        assetsCount: project._count.assets,
        findingsCount: project._count.findings,
        criticalFindingsCount,
        alertsCount,
        lastActivity: lastActivityDate.toISOString(),
      }}
    >
      {children}
    </ProjectShell>
  );
}
