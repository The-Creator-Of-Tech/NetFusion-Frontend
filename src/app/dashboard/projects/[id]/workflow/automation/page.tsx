import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AutomationClient from "@/components/workflow/AutomationClient";

interface Props { params: { id: string } }

export default async function AutomationPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <AutomationClient projectId={params.id} />
    </Suspense>
  );
}
