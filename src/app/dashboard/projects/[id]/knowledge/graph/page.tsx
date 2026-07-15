import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import GraphClient from "@/components/knowledge/GraphClient";

interface Props { params: { id: string } }

export default async function GraphPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <GraphClient projectId={params.id} />
    </Suspense>
  );
}
