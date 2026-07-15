import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import KnowledgeSearchClient from "@/components/knowledge/KnowledgeSearchClient";

interface Props { params: { id: string } }

export default async function KnowledgeSearchPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <KnowledgeSearchClient projectId={params.id} />
    </Suspense>
  );
}
