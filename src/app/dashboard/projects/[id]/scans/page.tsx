import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ScansPageClient from "@/components/ScansPageClient";

interface Props {
  params: { id: string };
}

export default async function ProjectScansPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Pre-fetch scan history so there's no client-side loading flash
  const scans = await prisma.scan.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });

  const serialized = scans.map((s) => ({
    id:        s.id,
    target:    s.target,
    results:   s.results as { target: string; profile?: string; ports: { port: number; state: string; service: string }[] },
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <ScansPageClient
      projectId={params.id}
      initialScans={serialized}
    />
  );
}
