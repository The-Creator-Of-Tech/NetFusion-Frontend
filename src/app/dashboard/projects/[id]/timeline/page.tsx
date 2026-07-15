import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import TimelineClient from "@/components/timeline/TimelineClient";

interface Props {
  params: { id: string };
}

export default async function TimelinePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const entries = await prisma.timelineEntry.findMany({
    where: { projectId: params.id },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = entries.map((e) => ({
    id: e.id,
    action: e.action,
    createdAt: e.createdAt.toISOString(),
    metadata: e.metadata as { model?: string; operation?: string; recordId?: string } | null,
    user: e.user,
  }));

  return (
    <TimelineClient
      projectId={params.id}
      initialEntries={serialized}
      currentUser={{ id: session.user.id, name: session.user.name ?? "You" }}
    />
  );
}
