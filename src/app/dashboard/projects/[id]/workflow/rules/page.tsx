import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import RulesClient from "@/components/workflow/RulesClient";

interface Props { params: { id: string } }

export default async function RulesPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <RulesClient projectId={params.id} />
    </Suspense>
  );
}
