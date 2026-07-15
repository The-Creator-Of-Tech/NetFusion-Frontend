import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import FindingsClient from "@/components/findings/FindingsClient";

interface Props {
  params: { id: string };
}

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;

export default async function FindingsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [findings, assets] = await Promise.all([
    prisma.finding.findMany({
      where: { projectId: params.id },
      include: {
        asset: { select: { id: true, ip: true, hostname: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.asset.findMany({
      where: { projectId: params.id },
      select: { id: true, ip: true, hostname: true, type: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const sorted = [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity as typeof SEVERITY_ORDER[number]) -
      SEVERITY_ORDER.indexOf(b.severity as typeof SEVERITY_ORDER[number])
  );

  const serialized = sorted.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));

  return (
    <Suspense>
      <FindingsClient
        projectId={params.id}
        initialFindings={serialized}
        assets={assets}
      />
    </Suspense>
  );
}
