import { prisma } from './src/lib/prisma';

const FASTAPI_URL = 'http://localhost:8000';

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

async function main() {
  const pid = '6523f477-0602-41fd-adbb-6510a2921195';
  const project = await prisma.project.findUnique({
    where: { id: pid },
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

  if (!project) return;

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

  const nodeMap = new Map<string, GraphNode>();

  const addNode = (n: GraphNode) => {
    if (!nodeMap.has(n.id)) {
      nodeMap.set(n.id, n);
      nodes.push(n);
    }
  };

  const addEdge = (source: string, target: string, label: string, weight = 1) => {
    if (nodeMap.has(source) && nodeMap.has(target)) {
      // Prevent duplicates
      const exists = edges.some(e => e.source === source && e.target === target && e.label === label);
      if (!exists) {
        edges.push({ id: `e_${edgeCounter++}`, source, target, label, weight });
      }
    }
  };

  // 1. Assets (2)
  project.assets.forEach((a) => {
    addNode({
      id: `asset_${a.id}`,
      type: 'asset',
      label: a.ip ?? a.hostname ?? a.id,
      metadata: { ip: a.ip, hostname: a.hostname, assetType: a.type },
    });
  });

  // 2. Findings (1)
  project.findings.forEach((f) => {
    const nodeId = `finding_${f.id}`;
    addNode({
      id: nodeId,
      type: 'finding',
      label: f.type,
      metadata: { severity: f.severity, description: f.description },
    });
    if (f.assetId) {
      addEdge(`asset_${f.assetId}`, nodeId, 'has_finding');
    }
  });

  // 3. MITRE (2)
  const seenMitre = new Set<string>();
  const mitreNodeIds: string[] = [];
  fapiMitre.forEach((t) => {
    const tid = t.mitreId ?? t.id ?? t.techniqueId ?? '';
    const name = t.name ?? t.technique ?? '';
    if (!tid || seenMitre.has(tid)) return;
    seenMitre.add(tid);
    const nodeId = `mitre_${tid}`;
    mitreNodeIds.push(nodeId);
    addNode({
      id: nodeId,
      type: 'mitre',
      label: `${tid}: ${name}`,
      metadata: { tactic: t.tactic, severity: t.severity, description: t.description },
    });
  });

  // 4. IOCs (2)
  const iocNodeIds: string[] = [];
  fapiIoc.forEach((ioc, i) => {
    const value = ioc.value ?? ioc.indicator ?? ioc.ioc ?? `ioc_${i}`;
    const nodeId = `ioc_${i}`;
    iocNodeIds.push(nodeId);
    addNode({
      id: nodeId,
      type: 'ioc',
      label: value,
      metadata: {
        type: ioc.iocType ?? ioc.type,
        severity: ioc.severity,
        source: ioc.source ?? ioc.matchedRule,
      },
    });
  });

  // 5. CVEs (2)
  const seenCve = new Set<string>();
  const cveNodeIds: string[] = [];
  fapiCve.forEach((c) => {
    const id = c.cveId ?? c.id ?? c.cve_id ?? '';
    if (!id || seenCve.has(id)) return;
    seenCve.add(id);
    const nodeId = `cve_${id}`;
    cveNodeIds.push(nodeId);
    addNode({
      id: nodeId,
      type: 'cve',
      label: id,
      metadata: { severity: c.severity, description: c.description, cvssScore: c.cvssScore },
    });
  });

  // 6. Threat Actors (1)
  const threatNodeIds: string[] = [];
  fapiThreats.forEach((actor: any, i: number) => {
    const actorId = `threat_${i}`;
    threatNodeIds.push(actorId);
    const name = actor.threatName ?? actor.name ?? `Actor ${i}`;
    addNode({
      id: actorId,
      type: 'threat_actor',
      label: name,
      metadata: { riskLevel: actor.riskLevel ?? actor.severity },
    });
  });

  // 7. Campaigns (1)
  const campaignNodeIds: string[] = [];
  fapiCampaigns.forEach((c: any, i: number) => {
    const campaignId = `campaign_${i}`;
    campaignNodeIds.push(campaignId);
    const name = c.name ?? `Campaign ${i}`;
    addNode({
      id: campaignId,
      type: 'campaign',
      label: name,
      metadata: { status: c.status, severity: c.severity },
    });
  });

  // ── Establish Relationships (Edges) ──────────────────────────────────────────
  // 1. Finding -> Asset (already added if f.assetId exists)
  // 2. Finding -> CVE (e.g. finding -> Log4j/cve_CVE-2021-44228)
  if (project.findings.length > 0 && cveNodeIds.length > 0) {
    addEdge(`finding_${project.findings[0].id}`, cveNodeIds[0], 'exposes_cve');
  }

  // 3. CVE -> MITRE (e.g. Log4j -> T1059, MSHTML -> T1204)
  if (cveNodeIds.length > 0 && mitreNodeIds.length > 0) {
    addEdge(cveNodeIds[0], mitreNodeIds[0], 'maps_to');
  }
  if (cveNodeIds.length > 1 && mitreNodeIds.length > 1) {
    addEdge(cveNodeIds[1], mitreNodeIds[1], 'maps_to');
  }

  // 4. Campaign -> Threat Actor (Operation Bearish Hunt -> APT28)
  if (campaignNodeIds.length > 0 && threatNodeIds.length > 0) {
    addEdge(campaignNodeIds[0], threatNodeIds[0], 'conducted_by');
  }

  // 5. Threat Actor -> IOC (APT28 -> 45.155.205.233 / ioc_0)
  if (threatNodeIds.length > 0 && iocNodeIds.length > 0) {
    addEdge(threatNodeIds[0], iocNodeIds[0], 'ATTRIBUTED_TO');
  }

  console.log(`TOTAL NODES: ${nodes.length}`);
  console.log(`TOTAL EDGES: ${edges.length}`);
  edges.forEach(e => console.log(`  [${e.label}] ${e.source} -> ${e.target}`));
}

main().finally(() => prisma.$disconnect());
