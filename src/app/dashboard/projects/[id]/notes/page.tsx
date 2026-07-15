import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import NotesClient from "@/components/notes/NotesClient";

interface Props {
  params: { id: string };
}

export default async function NotesPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const note = await prisma.note.findFirst({
    where: { projectId: params.id },
    include: {
      author: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const serialized = note
    ? {
        id: note.id,
        content: note.content,
        updatedAt: note.updatedAt.toISOString(),
        author: note.author,
      }
    : null;

  return <NotesClient projectId={params.id} initialNote={serialized} />;
}
