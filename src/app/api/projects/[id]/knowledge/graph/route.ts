import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const FASTAPI_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8000';

interface GraphNode {
  id: string;
  type: 'asset' | 'finding' | 'ioc' | 'mitre' | 'threat_actor' | 'campaign' | 'cve';
  label: string;
  metadata?: Record<string, any>;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight?: number;
}

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
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      ownerId: true,
      members: { select: { userId: true } },
      assets: { select: { id: true, ip: true, hostname: true, type: true } },
      findings: { select: { id: true, type: true, severity: true, assetId: true, description: true } },
      captureSession: {
        select: {
          iocs: true,
          mitre: true,
          trafficIntelligence: true,
          attackStory: true,
          alerts: true,
        },
      },
    },
  });

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const isOwner = project.ownerId === session.user.id;
  const isMember = project.members.some((m) => m.userId === session.user.id);
  if (!isOwner && !isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // ── Fan out to all FastAPI v2 knowledge endpoints in parallel ───────────────
  const pid = params.id;
  const [fapiMitre, fapiIoc, fapiCve, fapiThreats, fapiCampaigns] = await Promise.all([
    fetchFastAPI(`/api/v2/knowledge/mitre/?project_id=${pid}`),
    fetchFastAPI(`/api/v2/knowledge/ioc/?project_id=${pid}`),
    fetchFastAPI(`/api/v2/knowledge/cve/?project_id=${pid}`),
    fetchFastAPI(`/api/v2/knowledge/threat?project_id=${pid}`),
    fetchFastAPI(`/api/v2/knowledge/campaign?project_id=${pid}`),
  ]);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let edgeCounter = 0;

  const addEdge = (source: string, target: string, label: string, weight = 1) => {
    // Only add edge if both endpoints exist as nodes
    const srcExists = nodes.some((n) => n.id === source);
    const tgtExists = nodes.some((n) => n.id === target);
    if (srcExists && tgtExists) {
      edges.push({ id: `e_${edgeCounter++}`, source, target, label, weight });
    }
  };

  // ── Assets (from Prisma — always available) ─────────────────────────────────
  project.assets.forEach((a) => {
    nodes.push({
      id: `asset_${a.id}`,
      type: 'asset',
      label: a.ip ?? a.hostname ?? a.id,
      metadata: { ip: a.ip, hostname: a.hostname, assetType: a.type },
    });
  });

  // ── Findings → Assets ───────────────────────────────────────────────────────
  project.findings.forEach((f) => {
    const nodeId = `finding_${f.id}`;
    nodes.push({
      id: nodeId,
      type: 'finding',
      label: f.type,
      metadata: { severity: f.severity, description: f.description },
    });
    if (f.assetId) {
      addEdge(`asset_${f.assetId}`, nodeId, 'has_finding');
    }
  });

  // ── MITRE techniques ────────────────────────────────────────────────────────
  // Prefer FastAPI data; fall back to captureSession
  let mitreArr: any[] = fapiMitre;
  if (mitreArr.length === 0) {
    const rawMitre = project.captureSession?.mitre;
    mitreArr = Array.isArray(rawMitre)
      ? rawMitre
      : rawMitre && (rawMitre as any).techniques
      ? (rawMitre as any).techniques
      : [];
  }

  const seenMitre = new Set<string>();
  mitreArr.forEach((t) => {
    // FastAPI uses mitreId; captureSession uses id/techniqueId
    const tid = t.mitreId ?? t.id ?? t.techniqueId ?? '';
    const name = t.name ?? t.technique ?? '';
    if (!tid || seenMitre.has(tid)) return;
    seenMitre.add(tid);
    const nodeId = `mitre_${tid}`;
    nodes.push({
      id: nodeId,
      type: 'mitre',
      label: `${tid}: ${name}`,
      metadata: { tactic: t.tactic, severity: t.severity, description: t.description },
    });
    // Connect to findings that mention this technique
    project.findings.forEach((f) => {
      if (
        f.description?.toLowerCase().includes(tid.toLowerCase()) ||
        f.description?.toLowerCase().includes(name.toLowerCase())
      ) {
        addEdge(`finding_${f.id}`, nodeId, 'maps_to', 0.9);
      }
    });
  });

  // ── IOCs ─────────────────────────────────────────────────────────────────────
  // Prefer FastAPI data; fall back to captureSession
  let iocArr: any[] = fapiIoc;
  if (iocArr.length === 0) {
    const rawIocs = project.captureSession?.iocs;
    iocArr = Array.isArray(rawIocs) ? rawIocs : [];
  }

  iocArr.forEach((ioc, i) => {
    const value = ioc.value ?? ioc.indicator ?? ioc.ioc ?? `ioc_${i}`;
    const nodeId = `ioc_${i}`;
    nodes.push({
      id: nodeId,
      type: 'ioc',
      label: value,
      metadata: {
        type: ioc.iocType ?? ioc.type,
        severity: ioc.severity,
        source: ioc.source ?? ioc.matchedRule,
      },
    });
    // Connect IOCs to findings by severity match or description mention
    project.findings.forEach((f) => {
      if (f.severity === (ioc.severity ?? '').toUpperCase() || f.description?.includes(value)) {
        addEdge(`finding_${f.id}`, nodeId, 'matched_ioc', 0.5);
      }
    });
    // Connect high-severity IOCs to MITRE techniques
    const sev = (ioc.severity ?? '').toUpperCase();
    if (sev === 'CRITICAL' || sev === 'HIGH') {
      seenMitre.forEach((tid) => {
        addEdge(`mitre_${tid}`, nodeId, 'technique_uses', 0.8);
      });
    }
  });

  // ── CVEs ─────────────────────────────────────────────────────────────────────
  // Prefer FastAPI data; fall back to alert CVEs in captureSession
  let cveArr: any[] = fapiCve;
  if (cveArr.length === 0) {
    const alerts = project.captureSession?.alerts;
    const ti = project.captureSession?.trafficIntelligence as any;
    const seen = new Set<string>();
    const tmp: any[] = [];
    if (Array.isArray(alerts)) {
      alerts.forEach((a: any) => {
        const id = a.cve ?? a.cveId ?? a.cve_id ?? '';
        if (id && !seen.has(id)) { seen.add(id); tmp.push({ id, severity: a.severity }); }
      });
    }
    if (ti?.cves && Array.isArray(ti.cves)) {
      ti.cves.forEach((c: any) => {
        const id = c.id ?? c.cve_id ?? '';
        if (id && !seen.has(id)) { seen.add(id); tmp.push(c); }
      });
    }
    cveArr = tmp;
  }

  const seenCve = new Set<string>();
  cveArr.forEach((c) => {
    const id = c.cveId ?? c.id ?? c.cve_id ?? '';
    if (!id || seenCve.has(id)) return;
    seenCve.add(id);
    const nodeId = `cve_${id}`;
    nodes.push({
      id: nodeId,
      type: 'cve',
      label: id,
      metadata: { severity: c.severity, description: c.description, cvssScore: c.cvssScore },
    });
    // Connect CVEs to findings that mention them
    project.findings.forEach((f) => {
      if (f.description?.toLowerCase().includes(id.toLowerCase())) {
        addEdge(`finding_${f.id}`, nodeId, 'exposes_cve', 0.9);
      }
    });
  });

  // ── Threat Actors ─────────────────────────────────────────────────────────────
  // Prefer FastAPI data; fall back to trafficIntelligence
  let threatArr: any[] = fapiThreats;
  if (threatArr.length === 0) {
    const ti = project.captureSession?.trafficIntelligence as any;
    threatArr = ti?.threatActors && Array.isArray(ti.threatActors) ? ti.threatActors : [];
  }

  threatArr.forEach((actor: any, i: number) => {
    const actorId = `threat_${i}`;
    const name = actor.threatName ?? actor.name ?? `Actor ${i}`;
    nodes.push({
      id: actorId,
      type: 'threat_actor',
      label: name,
      metadata: { riskLevel: actor.riskLevel ?? actor.severity },
    });
    // Connect actors to their MITRE techniques
    const techniques: string[] = Array.isArray(actor.techniques)
      ? actor.techniques
      : actor.relatedTechniques
      ? String(actor.relatedTechniques).split(/[\s,]+/).filter(Boolean)
      : [];
    techniques.forEach((techId) => {
      if (seenMitre.has(techId)) {
        addEdge(actorId, `mitre_${techId}`, 'uses_technique');
      }
    });
    // Connect actors to IOCs they own
    const actorIocs: string[] = Array.isArray(actor.iocs)
      ? actor.iocs
      : actor.relatedIOCs
      ? String(actor.relatedIOCs).split(/[\s,]+/).filter(Boolean)
      : [];
    iocArr.forEach((ioc, j) => {
      const val = ioc.value ?? ioc.indicator ?? '';
      if (actorIocs.includes(val) || actorIocs.includes(ioc.iocId ?? ioc.id ?? '')) {
        addEdge(actorId, `ioc_${j}`, 'attributed_ioc', 0.7);
      }
    });
  });

  // ── Campaigns ─────────────────────────────────────────────────────────────────
  // Prefer FastAPI data; fall back to trafficIntelligence
  let campaignArr: any[] = fapiCampaigns;
  if (campaignArr.length === 0) {
    const ti = project.captureSession?.trafficIntelligence as any;
    campaignArr = ti?.campaigns && Array.isArray(ti.campaigns) ? ti.campaigns : [];
  }

  campaignArr.forEach((c: any, i: number) => {
    const campaignId = `campaign_${i}`;
    const name = c.name ?? `Campaign ${i}`;
    nodes.push({
      id: campaignId,
      type: 'campaign',
      label: name,
      metadata: { status: c.status, severity: c.severity },
    });
    // Connect campaigns to their associated threat actors
    threatArr.forEach((_actor, j) => {
      const actorName = _actor.threatName ?? _actor.name ?? '';
      const associated: string[] = Array.isArray(c.associatedActors)
        ? c.associatedActors
        : c.threatActors
        ? String(c.threatActors).split(/[\s,]+/).filter(Boolean)
        : [];
      if (associated.includes(actorName) || associated.includes(`threat_${j}`)) {
        addEdge(campaignId, `threat_${j}`, 'conducted_by', 0.8);
      }
    });
    // Connect campaigns to techniques
    const techniques: string[] = Array.isArray(c.associatedTechniques)
      ? c.associatedTechniques
      : c.relatedTechniques
      ? String(c.relatedTechniques).split(/[\s,]+/).filter(Boolean)
      : [];
    techniques.forEach((tid) => {
      if (seenMitre.has(tid)) {
        addEdge(campaignId, `mitre_${tid}`, 'uses_technique', 0.7);
      }
    });
  });

  return NextResponse.json({ nodes, edges });
}
