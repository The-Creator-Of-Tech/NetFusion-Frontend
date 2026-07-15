import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; techniqueId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      ownerId: true,
      members: { select: { userId: true } },
      captureSession: { select: { mitre: true } },
      findings: {
        select: { id: true, type: true, severity: true, description: true },
      },
    },
  });

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const isOwner = project.ownerId === session.user.id;
  const isMember = project.members.some((m) => m.userId === session.user.id);
  if (!isOwner && !isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const raw = project.captureSession?.mitre;
  const all: any[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as any).techniques)
    ? (raw as any).techniques
    : [];

  const tid = params.techniqueId.toUpperCase();
  const technique = all.find(
    (t: any) =>
      String(t.id ?? t.techniqueId ?? '').toUpperCase() === tid ||
      String(t.name ?? '').toUpperCase() === tid
  );

  if (!technique) {
    return NextResponse.json({ error: 'Technique not found' }, { status: 404 });
  }

  // Enrich with related findings
  const relatedFindings = project.findings
    .filter((f) =>
      f.description?.toLowerCase().includes((technique.name ?? '').toLowerCase()) ||
      f.type?.toLowerCase().includes('mitre') ||
      f.description?.toLowerCase().includes((technique.id ?? '').toLowerCase())
    )
    .map((f) => ({ id: f.id, type: f.type, severity: f.severity, description: f.description }));

  const enriched = {
    id: technique.id ?? technique.techniqueId ?? '',
    name: technique.name ?? technique.technique ?? '',
    tactic: technique.tactic ?? technique.phase ?? '',
    tacticId: technique.tacticId ?? null,
    platforms: Array.isArray(technique.platforms) ? technique.platforms : [],
    description: technique.description ?? null,
    detection: technique.detection ?? null,
    mitigations: Array.isArray(technique.mitigations) ? technique.mitigations : [],
    relatedTechniques: Array.isArray(technique.relatedTechniques) ? technique.relatedTechniques : [],
    evidence: technique.evidence ?? null,
    severity: technique.severity ?? null,
    url: technique.url ?? `https://attack.mitre.org/techniques/${(technique.id ?? '').replace('.', '/')}`,
    relatedFindings,
  };

  return NextResponse.json(enriched);
}
