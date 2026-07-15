import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ReportsClient from "@/components/reports/ReportsClient";
import type { ReportRow } from "@/types/reports";

interface Props {
  params: { id: string };
}

export default async function ReportsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { name: true },
  });

  if (!project) redirect("/dashboard?error=not_found");

  // Fetch initial data server-side for fast first paint.
  // The client store takes over from here (live refresh, filtering, etc.)
  const reports = await prisma.report.findMany({
    where: { projectId: params.id },
    include: {
      generatedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const initialReports: ReportRow[] = reports.map((r) => ({
    id:          r.id,
    title:       r.title,
    riskLevel:   r.riskLevel,
    sections:    r.sections as string[],
    createdAt:   r.createdAt.toISOString(),
    generatedBy: r.generatedBy.name,
  }));

  return (
    <ReportsClient
      projectId={params.id}
      projectName={project.name}
      initialReports={initialReports}
    />
  );
}
