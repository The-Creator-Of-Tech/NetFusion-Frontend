import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import CveClient from "@/components/knowledge/CveClient";

interface Props { params: { id: string } }

export default async function CvePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <CveClient projectId={params.id} />
    </Suspense>
  );
}
