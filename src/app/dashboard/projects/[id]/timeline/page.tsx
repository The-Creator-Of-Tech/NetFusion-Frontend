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

  const rows = await prisma.timelineEntry.findMany({
    where: { projectId: params.id },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Normalise to unified schema — handles rows written before the migration
  const initialEntries = rows.map((e) => {
    const meta = e.metadata as Record<string, unknown> | null;
    const source = (e as any).source ?? deriveSource(meta);
    return {
      eventId:         e.id,
      projectId:       e.projectId,
      executionId:     (e as any).executionId ?? (meta?.executionId as string) ?? null,
      investigationId: (e as any).investigationId ?? (meta?.investigationId as string) ?? null,
      source,
      title:           (e as any).title ?? e.action.slice(0, 80),
      description:     e.action,
      severity:        (e as any).severity ?? null,
      createdAt:       e.createdAt.toISOString(),
      metadata:        meta,
      user:            e.user,
      // Legacy compat
      id:              e.id,
      action:          e.action,
    };
  });

  return (
    <TimelineClient
      projectId={params.id}
      initialEntries={initialEntries}
      currentUser={{ id: session.user.id, name: session.user.name ?? "You" }}
    />
  );
}

function deriveSource(meta: Record<string, unknown> | null): string {
  const model = ((meta?.model as string) ?? "").toLowerCase();
  const map: Record<string, string> = {
    asset: "asset", finding: "finding", note: "note",
    member: "member", manual: "manual", scan: "nmap",
    ai: "ai", ioc: "ioc", capture: "capture",
    playbook: "workflow", automation: "workflow", case: "workflow",
  };
  return map[model] ?? "system";
}
