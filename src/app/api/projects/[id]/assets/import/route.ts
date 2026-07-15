import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function guardProject(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!member;
}

// POST /api/projects/[id]/assets/import
// Body: { rows: Array<{ ip, hostname, type, tags }> }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await guardProject(params.id, session.user.id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    if (rows.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 rows per import" },
        { status: 400 }
      );
    }

    // Validate each row has at least a type
    const validRows = rows.filter(
      (r: { ip?: string; hostname?: string; type?: string; tags?: string }) =>
        r.type && typeof r.type === "string" && r.type.trim().length > 0
    );

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows — each row must have a type" },
        { status: 400 }
      );
    }

    // Bulk insert using createMany
    // Note: createMany doesn't trigger the $extends middleware, so we
    // create a single timeline entry summarising the import instead.
    await prisma.asset.createMany({
      data: validRows.map(
        (r: { ip?: string; hostname?: string; type?: string; tags?: string }) => ({
          projectId: params.id,
          ip: r.ip?.trim() || null,
          hostname: r.hostname?.trim() || null,
          type: (r.type ?? "Other").trim(),
          tags: r.tags
            ? r.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
            : [],
          notes: null,
        })
      ),
      skipDuplicates: true,
    });

    // Manual timeline entry for the bulk import
    await prisma.timelineEntry.create({
      data: {
        projectId: params.id,
        userId: session.user.id,
        action: `${validRows.length} asset${validRows.length > 1 ? "s" : ""} imported via CSV`,
        metadata: { model: "Asset", operation: "import", count: validRows.length },
      },
    });

    return NextResponse.json({ imported: validRows.length }, { status: 201 });
  } catch (error) {
    console.error("Import assets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
