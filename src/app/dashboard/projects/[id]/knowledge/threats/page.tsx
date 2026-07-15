import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ThreatsClient from "@/components/knowledge/ThreatsClient";

interface Props { params: { id: string } }

export default async function ThreatsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <ThreatsClient projectId={params.id} />
    </Suspense>
  );
}
