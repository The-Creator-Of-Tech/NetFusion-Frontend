import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import MitreClient from "@/components/knowledge/MitreClient";

interface Props { params: { id: string } }

export default async function MitrePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <MitreClient projectId={params.id} />
    </Suspense>
  );
}
