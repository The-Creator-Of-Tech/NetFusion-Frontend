import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import WorkflowDashboardClient from "@/components/workflow/WorkflowDashboardClient";

interface Props { params: { id: string } }

export default async function WorkflowPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <WorkflowDashboardClient projectId={params.id} />
    </Suspense>
  );
}
