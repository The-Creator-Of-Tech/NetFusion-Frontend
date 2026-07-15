import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AssetsClient from "@/components/assets/AssetsClient";

interface Props {
  params: { id: string };
}

export default async function AssetsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const assets = await prisma.asset.findMany({
    where: { projectId: params.id },
    include: { _count: { select: { findings: true } } },
    orderBy: { createdAt: "desc" },
  });

  const serialized = assets.map((a) => ({
    ...a,
    tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <Suspense>
      <AssetsClient projectId={params.id} initialAssets={serialized} />
    </Suspense>
  );
}
