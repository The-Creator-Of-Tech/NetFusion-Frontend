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
      captureSession: {
        select: {
          attackStory: true,
          trafficIntelligence: true,
          mitre: true,
          iocs: true,
          investigationPlan: true,
        },
      },
      findings: { select: { id: true, type: true, severity: true } },
    },
  });

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const isOwner = project.ownerId === session.user.id;
  const isMember = project.members.some((m) => m.userId === session.user.id);
  if (!isOwner && !isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Try FastAPI v2 knowledge endpoint first
  try {
    const response = await fetch(`${FASTAPI_URL}/api/v2/knowledge/campaign?project_id=${params.id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      // FastAPI returns { success, data: [...], metadata: { pagination: { totalItems } } }
      const raw = data.data ?? data.campaigns ?? data;
      const rawArr: any[] = Array.isArray(raw) ? raw : [];
      if (rawArr.length > 0) {
        // Normalise FastAPI field names to the shape the frontend expects
        const campaigns = rawArr.map((c: any) => ({
          id: c.campaignId ?? c.id ?? `campaign_${Math.random()}`,
          name: c.name ?? 'Unknown Campaign',
          description: c.description ?? undefined,
          status: c.active === true ? 'active' : (c.active === false ? 'concluded' : 'unknown'),
          severity: c.severity ?? (c.confidence === 'HIGH' ? 'HIGH' : undefined),
          startDate: c.startDate || undefined,
          endDate: c.endDate || undefined,
          associatedActors: c.threatActors ? String(c.threatActors).split(/\s+/).filter(Boolean) : [],
          associatedTechniques: c.relatedTechniques ? String(c.relatedTechniques).split(/[\s,]+/).filter(Boolean) : [],
          findings: [],
          assets: [],
          reports: [],
          iocs: c.relatedIOCs ? String(c.relatedIOCs).split(/[\s,]+/).filter(Boolean) : [],
          objectives: undefined,
          attribution: undefined,
          confidence: c.confidence ?? undefined,
        }));
        const total = data.metadata?.pagination?.totalItems ?? campaigns.length;
        return NextResponse.json({ campaigns, total });
      }
    }
  } catch {
    // FastAPI unavailable — fall through to captureSession
  }

  // Fallback: derive campaigns from captureSession data
  const cs = project.captureSession;
  const campaigns: any[] = [];

  // 1. Explicit campaigns from trafficIntelligence
  const ti = cs?.trafficIntelligence as any;
  if (ti?.campaigns && Array.isArray(ti.campaigns)) {
    for (const c of ti.campaigns) {
      campaigns.push({
        id: c.id ?? `campaign_${campaigns.length}`,
        name: c.name ?? 'Unknown Campaign',
        description: c.description ?? undefined,
        status: c.status ?? 'unknown',
        severity: c.severity ?? undefined,
        startDate: c.startDate ?? c.start_date ?? undefined,
        endDate: c.endDate ?? c.end_date ?? undefined,
        associatedActors: Array.isArray(c.associatedActors) ? c.associatedActors : [],
        associatedTechniques: Array.isArray(c.associatedTechniques) ? c.associatedTechniques : [],
        findings: Array.isArray(c.findings) ? c.findings : [],
        assets: Array.isArray(c.assets) ? c.assets : [],
        reports: Array.isArray(c.reports) ? c.reports : [],
        iocs: Array.isArray(c.iocs) ? c.iocs : [],
        objectives: c.objectives ?? undefined,
        attribution: c.attribution ?? undefined,
      });
    }
  }

  // 2. Synthesise a campaign from attackStory if present
  if (campaigns.length === 0 && cs?.attackStory) {
    const story = cs.attackStory as any;

    if (story && (story.title || story.story || story.executive_summary)) {
      const mitreRaw = cs?.mitre as any;
      const mitreArr = Array.isArray(mitreRaw) ? mitreRaw : (Array.isArray(mitreRaw?.techniques) ? mitreRaw.techniques : []);
      const techniqueIds = mitreArr.map((t: any) => t.id ?? t.techniqueId).filter(Boolean);
      const findingIds = (project.findings ?? []).map((f) => f.id);
      const iocValues = Array.isArray(cs?.iocs)
        ? (cs.iocs as any[]).slice(0, 10).map((i: any) => i.value ?? i.asset ?? '').filter(Boolean)
        : [];

      // Determine status from story
      let status: 'active' | 'concluded' | 'unknown' = 'unknown';
      const storyText = JSON.stringify(story).toLowerCase();
      if (storyText.includes('active') || storyText.includes('ongoing')) status = 'active';
      else if (storyText.includes('concluded') || storyText.includes('complete')) status = 'concluded';

      campaigns.push({
        id: 'campaign_detected',
        name: story.title ?? 'Detected Attack Campaign',
        description: story.executive_summary ?? undefined,
        status,
        severity: story.severity?.toUpperCase() ?? undefined,
        associatedTechniques: techniqueIds,
        findings: findingIds,
        iocs: iocValues,
        assets: [],
        associatedActors: [],
        reports: [],
        objectives: Array.isArray(story.next_steps)
          ? story.next_steps.slice(0, 3).join('; ')
          : (story.next_steps ?? undefined),
        attribution: undefined,
      });
    }
  }

  // 3. Synthesise from MITRE + findings if still empty
  if (campaigns.length === 0) {
    const mitreRaw = cs?.mitre as any;
    const mitreArr = Array.isArray(mitreRaw) ? mitreRaw : (Array.isArray(mitreRaw?.techniques) ? mitreRaw.techniques : []);
    const findingsList = project.findings ?? [];

    if (mitreArr.length > 0 || findingsList.length > 0) {
      const techniqueIds = mitreArr.map((t: any) => t.id ?? t.techniqueId).filter(Boolean);
      const tactics = [...new Set(mitreArr.map((t: any) => t.tactic).filter(Boolean))] as string[];
      const findingIds = findingsList.map((f) => f.id);
      const criticalFindings = findingsList.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH');

      campaigns.push({
        id: 'campaign_inferred',
        name: tactics.length > 0
          ? `Detected Campaign: ${tactics.slice(0, 2).join(' → ')}`
          : 'Detected Security Campaign',
        description: `Campaign inferred from ${mitreArr.length} MITRE technique(s) and ${findingsList.length} finding(s) detected during capture analysis.`,
        status: criticalFindings.length > 0 ? 'active' : 'unknown',
        severity: criticalFindings.length > 0 ? 'HIGH' : (findingsList.length > 0 ? 'MEDIUM' : undefined),
        associatedTechniques: techniqueIds,
        findings: findingIds,
        iocs: Array.isArray(cs?.iocs)
          ? (cs.iocs as any[]).slice(0, 5).map((i: any) => i.value ?? i.asset ?? '').filter(Boolean)
          : [],
        assets: [],
        associatedActors: [],
        reports: [],
      });
    }
  }

  return NextResponse.json({ campaigns, total: campaigns.length });
}
