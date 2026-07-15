import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import CaseFlowClient from "@/components/workflow/CaseFlowClient";

interface Props { params: { id: string } }

export default async function CasesPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <CaseFlowClient projectId={params.id} />
    </Suspense>
  );
}
