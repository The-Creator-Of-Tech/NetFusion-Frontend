import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ExecutionPlaybookPickerClient from "@/components/workflow/ExecutionPlaybookPickerClient";

interface Props { params: { id: string } }

export default async function ExecutionsIndexPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense>
      <ExecutionPlaybookPickerClient projectId={params.id} />
    </Suspense>
  );
}
