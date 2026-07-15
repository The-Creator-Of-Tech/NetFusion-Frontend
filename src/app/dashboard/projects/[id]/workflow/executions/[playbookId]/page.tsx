import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ExecutionMonitorClient from "@/components/workflow/ExecutionMonitorClient";

interface Props { params: { id: string; playbookId: string } }

export default async function PlaybookExecutionsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <ExecutionMonitorClient projectId={params.id} playbookId={params.playbookId} />
    </Suspense>
  );
}
