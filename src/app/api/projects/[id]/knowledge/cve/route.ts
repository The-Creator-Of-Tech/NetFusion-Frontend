import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const FASTAPI_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8000';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      ownerId: true,
      members: { select: { userId: true } },
      captureSession: { select: { trafficIntelligence: true, attackStory: true } },
    },
  });

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const isOwner = project.ownerId === session.user.id;
  const isMember = project.members.some((m) => m.userId === session.user.id);
  if (!isOwner && !isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Try FastAPI v2 knowledge endpoint first
  try {
    const response = await fetch(`${FASTAPI_URL}/api/v2/knowledge/cve/?project_id=${params.id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      // FastAPI returns { success, data: [...], metadata: { pagination: { totalItems } } }
      const raw = data.data ?? data.records ?? data;
      const rawArr: any[] = Array.isArray(raw) ? raw : [];
      if (rawArr.length > 0) {
        // Normalise FastAPI field names to the shape the frontend expects
        const records = rawArr.map((c: any) => ({
          id: c.cveId ?? c.id ?? c.recordKey ?? '',
          description: c.description ?? undefined,
          severity: (c.severity ?? 'MEDIUM').toUpperCase(),
          cvssScore: c.cvssScore ?? undefined,
          patchStatus: c.patched === true ? 'patched' : (c.exploited === true ? 'exploit_available' : 'unknown'),
          vendor: c.vendor ?? undefined,
          product: c.product ?? undefined,
          publishedDate: c.publishedDate || undefined,
          affectedPlatforms: c.affectedPlatforms ? String(c.affectedPlatforms).split(/\s+/).filter(Boolean) : [],
          mappedTechniques: c.mappedTechniques ? String(c.mappedTechniques).split(/[\s,]+/).filter(Boolean) : [],
        }));
        const total = data.metadata?.pagination?.totalItems ?? records.length;
        return NextResponse.json({ records, total });
      }
    }
  } catch {
    // FastAPI unavailable — fall through to captureSession
  }

  // Fallback: derive CVEs from captureSession trafficIntelligence / attackStory
  const cs = project.captureSession;
  const records: any[] = [];

  // Extract CVE references from attackStory if available
  if (cs?.attackStory) {
    const story = cs.attackStory as any;
    const text = JSON.stringify(story);
    const cveMatches = [...text.matchAll(/CVE-\d{4}-\d+/g)].map((m) => m[0]);
    const unique = [...new Set(cveMatches)];
    for (const id of unique) {
      records.push({
        id,
        description: `CVE referenced in attack story analysis.`,
        severity: story.severity?.toUpperCase() ?? 'MEDIUM',
        patchStatus: 'unknown',
      });
    }
  }

  // Extract CVE references from trafficIntelligence if available
  if (records.length === 0 && cs?.trafficIntelligence) {
    const ti = cs.trafficIntelligence as any;
    const text = JSON.stringify(ti);
    const cveMatches = [...text.matchAll(/CVE-\d{4}-\d+/g)].map((m) => m[0]);
    const unique = [...new Set(cveMatches)];
    for (const id of unique) {
      if (!records.find((r) => r.id === id)) {
        records.push({
          id,
          description: `CVE referenced in traffic intelligence analysis.`,
          severity: 'MEDIUM',
          patchStatus: 'unknown',
        });
      }
    }
  }

  return NextResponse.json({ records, total: records.length });
}
