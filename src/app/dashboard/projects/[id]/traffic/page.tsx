import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TrafficPanel from "@/components/project/TrafficPanel";

interface Props {
  params: { id: string };
}

export default async function ProjectTrafficPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <TrafficPanel projectId={params.id} />;
}
