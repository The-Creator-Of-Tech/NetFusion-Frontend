import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/settings/SettingsClient";

interface Props {
  params: { id: string };
}

export default async function SettingsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      invites: {
        where: { usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) redirect("/dashboard?error=not_found");

  const isOwner = project.ownerId === session.user.id;

  const members = project.members.map((m) => ({
    id: m.id,
    role: m.role as string,
    joinedAt: m.joinedAt.toISOString(),
    user: m.user,
  }));

  const pendingInvites = project.invites.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as string,
    createdAt: inv.createdAt.toISOString(),
    expiresAt: inv.expiresAt.toISOString(),
  }));

  return (
    <SettingsClient
      projectId={params.id}
      projectName={project.name}
      projectDescription={project.description}
      initialMembers={members}
      initialInvites={pendingInvites}
      currentUserId={session.user.id}
      isOwner={isOwner}
    />
  );
}
