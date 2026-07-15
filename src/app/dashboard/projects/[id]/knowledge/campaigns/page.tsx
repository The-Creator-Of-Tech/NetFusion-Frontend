import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import CampaignsClient from "@/components/knowledge/CampaignsClient";

interface Props { params: { id: string } }

export default async function CampaignsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <CampaignsClient projectId={params.id} />
    </Suspense>
  );
}
