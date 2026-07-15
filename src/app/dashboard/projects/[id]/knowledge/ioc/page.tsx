import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import IocClient from "@/components/knowledge/IocClient";

interface Props { params: { id: string } }

export default async function IocPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <IocClient projectId={params.id} />
    </Suspense>
  );
}
