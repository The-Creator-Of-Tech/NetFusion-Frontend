import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const FASTAPI_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8000';

// ── Helper: fetch one FastAPI v2 knowledge endpoint, return raw array ──────────
async function fetchFastAPI(path: string): Promise<any[]> {
  try {
    const res = await fetch(`${FASTAPI_URL}${path}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data.data ?? data.techniques ?? data.records ?? data.actors ?? data.campaigns ?? data;
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      ownerId: true,
      members: { select: { userId: true } },
      captureSession: {
        select: { mitre: true, iocs: true, alerts: true, trafficIntelligence: true, attackStory: true },
      },
    },
  });

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const isOwner = project.ownerId === session.user.id;
  const isMember = project.members.some((m) => m.userId === session.user.id);
  if (!isOwner && !isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const query = (req.nextUrl.searchParams.get('q') ?? '').toLowerCase().trim();

  // ── Fan out to all FastAPI v2 knowledge endpoints in parallel ───────────────
  const pid = params.id;
  const [fapiMitre, fapiIoc, fapiCve, fapiThreats, fapiCampaigns] = await Promise.all([
    fetchFastAPI(`/api/v2/knowledge/mitre/?project_id=${pid}`),
    fetchFastAPI(`/api/v2/knowledge/ioc/?project_id=${pid}`),
    fetchFastAPI(`/api/v2/knowledge/cve/?project_id=${pid}`),
    fetchFastAPI(`/api/v2/knowledge/threat?project_id=${pid}`),
    fetchFastAPI(`/api/v2/knowledge/campaign?project_id=${pid}`),
  ]);

  const results: Array<{
    id: string;
    type: 'mitre' | 'cve' | 'ioc' | 'threat' | 'campaign';
    title: string;
    subtitle?: string;
    severity?: string;
    tags?: string[];
  }> = [];

  // ── MITRE ─────────────────────────────────────────────────────────────────────
  let mitreArr: any[] = fapiMitre;
  if (mitreArr.length === 0) {
    const rawMitre = project.captureSession?.mitre;
    mitreArr = Array.isArray(rawMitre)
      ? rawMitre
      : rawMitre && (rawMitre as any).techniques
      ? (rawMitre as any).techniques
      : [];
  }
  mitreArr.forEach((t: any) => {
    const tid = (t.mitreId ?? t.id ?? t.techniqueId ?? '').toString();
    const name = t.name ?? t.technique ?? '';
    const tactic = t.tactic ?? '';
    if (!query || tid.toLowerCase().includes(query) || name.toLowerCase().includes(query) || tactic.toLowerCase().includes(query)) {
      results.push({
        id: tid || `mitre_${results.length}`,
        type: 'mitre',
        title: tid ? `${tid}: ${name}` : name,
        subtitle: tactic,
        severity: t.severity,
        tags: [tactic].filter(Boolean),
      });
    }
  });

  // ── IOCs ──────────────────────────────────────────────────────────────────────
  let iocArr: any[] = fapiIoc;
  if (iocArr.length === 0) {
    const rawIocs = project.captureSession?.iocs;
    iocArr = Array.isArray(rawIocs)
      ? rawIocs
      : rawIocs && (rawIocs as any).indicators
      ? (rawIocs as any).indicators
      : [];
  }
  iocArr.forEach((ioc: any, idx: number) => {
    const value = ioc.value ?? ioc.indicator ?? ioc.ioc ?? '';
    const iocType = (ioc.iocType ?? ioc.type ?? '').toString();
    if (!query || value.toLowerCase().includes(query) || iocType.toLowerCase().includes(query)) {
      results.push({
        id: ioc.iocId ?? ioc.id ?? `ioc_${idx}`,
        type: 'ioc',
        title: value,
        subtitle: iocType,
        severity: ioc.severity,
        tags: ioc.tags ?? [],
      });
    }
  });

  // ── CVEs ──────────────────────────────────────────────────────────────────────
  let cveArr: any[] = fapiCve;
  if (cveArr.length === 0) {
    const alerts = project.captureSession?.alerts;
    const ti = project.captureSession?.trafficIntelligence as any;
    const cveSeen = new Set<string>();
    const tmp: any[] = [];
    if (Array.isArray(alerts)) {
      alerts.forEach((a: any) => {
        const id = a.cve ?? a.cveId ?? a.cve_id ?? '';
        if (id && !cveSeen.has(id)) { cveSeen.add(id); tmp.push({ id, severity: a.severity }); }
      });
    }
    if (ti?.cves && Array.isArray(ti.cves)) {
      ti.cves.forEach((c: any) => {
        const id = c.id ?? c.cve_id ?? '';
        if (id && !cveSeen.has(id)) { cveSeen.add(id); tmp.push(c); }
      });
    }
    cveArr = tmp;
  }
  const cveSeen = new Set<string>();
  cveArr.forEach((c: any) => {
    const id = (c.cveId ?? c.id ?? c.cve_id ?? '').toString();
    if (!id || cveSeen.has(id)) return;
    cveSeen.add(id);
    const description = c.description ?? '';
    if (!query || id.toLowerCase().includes(query) || description.toLowerCase().includes(query)) {
      results.push({
        id,
        type: 'cve',
        title: id,
        subtitle: description,
        severity: c.severity,
        tags: [],
      });
    }
  });

  // ── Threat Actors ─────────────────────────────────────────────────────────────
  let threatArr: any[] = fapiThreats;
  if (threatArr.length === 0) {
    const ti = project.captureSession?.trafficIntelligence as any;
    const storyActors = ((project.captureSession?.attackStory as any)?.threatActors ?? []) as any[];
    threatArr = [
      ...(ti?.threatActors && Array.isArray(ti.threatActors) ? ti.threatActors : []),
      ...storyActors,
    ];
  }
  threatArr.forEach((a: any, idx: number) => {
    const name = a.threatName ?? a.name ?? `Actor ${idx}`;
    const description = a.description ?? '';
    if (!query || name.toLowerCase().includes(query) || description.toLowerCase().includes(query)) {
      results.push({
        id: a.threatId ?? a.id ?? `threat_${idx}`,
        type: 'threat',
        title: name,
        subtitle: description,
        severity: a.riskLevel ?? a.severity,
        tags: Array.isArray(a.labels) ? a.labels : [],
      });
    }
  });

  // ── Campaigns ─────────────────────────────────────────────────────────────────
  let campaignArr: any[] = fapiCampaigns;
  if (campaignArr.length === 0) {
    const ti = project.captureSession?.trafficIntelligence as any;
    campaignArr = ti?.campaigns && Array.isArray(ti.campaigns) ? ti.campaigns : [];
  }
  campaignArr.forEach((c: any, idx: number) => {
    const name = c.name ?? `Campaign ${idx}`;
    const description = c.description ?? '';
    if (!query || name.toLowerCase().includes(query) || description.toLowerCase().includes(query)) {
      results.push({
        id: c.campaignId ?? c.id ?? `campaign_${idx}`,
        type: 'campaign',
        title: name,
        subtitle: description,
        severity: c.severity,
        tags: [],
      });
    }
  });

  return NextResponse.json({ results, total: results.length });
}
