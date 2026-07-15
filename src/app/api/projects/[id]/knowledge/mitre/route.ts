import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const FASTAPI_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8000';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      ownerId: true,
      members: { select: { userId: true } },
      captureSession: { select: { mitre: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const isOwner = project.ownerId === session.user.id;
  const isMember = project.members.some((m) => m.userId === session.user.id);
  if (!isOwner && !isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Try FastAPI v2 knowledge endpoint first
  try {
    const response = await fetch(`${FASTAPI_URL}/api/v2/knowledge/mitre/?project_id=${params.id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      // FastAPI returns { success, data: [...], metadata: { pagination: { totalItems } } }
      const raw = data.data ?? data.techniques ?? data;
      const rawArr: any[] = Array.isArray(raw) ? raw : [];
      if (rawArr.length > 0) {
        // Normalise FastAPI field names (mitreId → id, techniqueId is a UUID key)
        const techniques = rawArr.map((t: any) => ({
          id: t.mitreId ?? t.id ?? t.techniqueId ?? '',
          name: t.name ?? t.technique ?? '',
          tactic: t.tactic ?? '',
          description: t.description ?? undefined,
          platforms: t.platforms ? String(t.platforms).split(/\s+/).filter(Boolean) : [],
          detection: t.detection ?? undefined,
          mitigations: t.mitigations ? (Array.isArray(t.mitigations) ? t.mitigations : String(t.mitigations).split(/\s*,\s*/).filter(Boolean)) : [],
          severity: t.severity ?? undefined,
          revoked: t.revoked ?? false,
          deprecated: t.deprecated ?? false,
        }));
        const total = data.metadata?.pagination?.totalItems ?? techniques.length;
        return NextResponse.json({ techniques, total });
      }
    }
  } catch {
    // FastAPI unavailable — fall through to captureSession
  }

  // Fallback: read from captureSession stored in Prisma
  const raw = project.captureSession?.mitre;
  let techniques: any[] = [];
  if (Array.isArray(raw)) {
    techniques = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as any;
    techniques = Array.isArray(obj.techniques) ? obj.techniques : [];
  }

  return NextResponse.json({ techniques, total: techniques.length });
}
