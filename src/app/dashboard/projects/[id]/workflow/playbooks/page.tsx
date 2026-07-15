import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import PlaybooksClient from "@/components/workflow/PlaybooksClient";

interface Props { params: { id: string } }

export default async function PlaybooksPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <PlaybooksClient projectId={params.id} />
    </Suspense>
  );
}
