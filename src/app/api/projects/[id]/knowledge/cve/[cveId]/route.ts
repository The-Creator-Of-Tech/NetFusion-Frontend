import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; cveId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      ownerId: true,
      members: { select: { userId: true } },
      captureSession: { select: { alerts: true, trafficIntelligence: true } },
      findings: { select: { id: true, type: true, severity: true, description: true, assetId: true } },
      assets: { select: { id: true, ip: true, hostname: true } },
    },
  });

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const isOwner = project.ownerId === session.user.id;
  const isMember = project.members.some((m) => m.userId === session.user.id);
  if (!isOwner && !isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Gather all CVE sources
  const allCves: any[] = [];
  const alerts = project.captureSession?.alerts;
  if (Array.isArray(alerts)) {
    alerts.forEach((a: any) => {
      if (a.cve || a.cveId || a.cve_id) {
        allCves.push({ id: a.cve ?? a.cveId ?? a.cve_id, ...a });
      }
    });
  }
  const ti = project.captureSession?.trafficIntelligence as any;
  if (ti?.cves && Array.isArray(ti.cves)) allCves.push(...ti.cves);

  const targetId = params.cveId.toUpperCase();
  const found = allCves.find(
    (c) => (c.id ?? c.cve_id ?? c.cveId ?? '').toUpperCase() === targetId
  );

  if (!found) return NextResponse.json({ error: 'CVE not found' }, { status: 404 });

  const relatedFindings = project.findings
    .filter((f) => f.description?.includes(found.id ?? '') || f.type?.toLowerCase().includes('cve'))
    .map((f) => ({ id: f.id, severity: f.severity, description: f.description }));

  const affectedAssetIds = new Set(relatedFindings.map((f) => {
    const orig = project.findings.find((pf) => pf.id === f.id);
    return orig?.assetId;
  }).filter(Boolean));

  const relatedAssets = project.assets
    .filter((a) => affectedAssetIds.has(a.id))
    .map((a) => ({ id: a.id, ip: a.ip, hostname: a.hostname }));

  return NextResponse.json({
    ...found,
    id: found.id ?? found.cve_id ?? found.cveId,
    relatedFindings,
    relatedAssets,
  });
}
