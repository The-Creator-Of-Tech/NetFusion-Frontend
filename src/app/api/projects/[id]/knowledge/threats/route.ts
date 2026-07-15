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
          trafficIntelligence: true,
          attackStory: true,
          mitre: true,
          iocs: true,
        },
      },
    },
  });

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const isOwner = project.ownerId === session.user.id;
  const isMember = project.members.some((m) => m.userId === session.user.id);
  if (!isOwner && !isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Try FastAPI v2 knowledge endpoint first
  try {
    const response = await fetch(`${FASTAPI_URL}/api/v2/knowledge/threat?project_id=${params.id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      // FastAPI returns { success, data: [...], metadata: { pagination: { totalItems } } }
      const raw = data.data ?? data.actors ?? data;
      const rawArr: any[] = Array.isArray(raw) ? raw : [];
      if (rawArr.length > 0) {
        // Normalise FastAPI field names to the shape the frontend expects
        const actors = rawArr.map((a: any) => ({
          id: a.threatId ?? a.id ?? a.name,
          name: a.threatName ?? a.name ?? 'Unknown Actor',
          description: a.description ?? undefined,
          riskLevel: (a.severity ?? a.confidence ?? 'UNKNOWN').toUpperCase(),
          techniques: Array.isArray(a.relatedTechniques) ? a.relatedTechniques : (a.relatedTechniques ? String(a.relatedTechniques).split(/\s+/).filter(Boolean) : []),
          campaigns: Array.isArray(a.campaigns) ? a.campaigns : [],
          iocs: Array.isArray(a.relatedIOCs) ? a.relatedIOCs : (a.relatedIOCs ? String(a.relatedIOCs).split(/\s+/).filter(Boolean) : []),
          country: a.country ?? a.origin ?? undefined,
          motivation: a.motivation ?? undefined,
          sophistication: a.sophistication ?? undefined,
          aliases: Array.isArray(a.aliases) ? a.aliases : [],
          labels: Array.isArray(a.labels) ? a.labels : [],
          active: a.active ?? true,
          confidence: a.confidence ?? undefined,
        }));
        const total = data.metadata?.pagination?.totalItems ?? actors.length;
        return NextResponse.json({ actors, total });
      }
    }
  } catch {
    // FastAPI unavailable — fall through to captureSession
  }

  // Fallback: derive threat actors from captureSession data
  const cs = project.captureSession;
  const actors: any[] = [];

  // 1. Explicit threatActors from trafficIntelligence
  const ti = cs?.trafficIntelligence as any;
  if (ti?.threatActors && Array.isArray(ti.threatActors)) {
    for (const a of ti.threatActors) {
      actors.push({
        id: a.id ?? a.name ?? `actor_${actors.length}`,
        name: a.name ?? 'Unknown Actor',
        description: a.description ?? undefined,
        riskLevel: (a.riskLevel ?? a.risk ?? 'UNKNOWN').toUpperCase(),
        techniques: Array.isArray(a.techniques) ? a.techniques : [],
        campaigns: Array.isArray(a.campaigns) ? a.campaigns : [],
        iocs: Array.isArray(a.iocs) ? a.iocs : [],
        country: a.country ?? a.origin ?? undefined,
        motivation: a.motivation ?? undefined,
        sophistication: a.sophistication ?? undefined,
        aliases: Array.isArray(a.aliases) ? a.aliases : [],
        labels: Array.isArray(a.labels) ? a.labels : [],
      });
    }
  }

  // 2. Derive actors from attackStory if present
  if (actors.length === 0 && cs?.attackStory) {
    const story = cs.attackStory as any;
    const actorNames: string[] = [];

    // Extract actor mentions from priority_targets
    if (Array.isArray(story.priority_targets)) {
      for (const t of story.priority_targets) {
        if (t.actor || t.threat_actor) {
          actorNames.push(t.actor ?? t.threat_actor);
        }
      }
    }

    // Extract from story phases
    if (Array.isArray(story.story)) {
      for (const phase of story.story) {
        const text = typeof phase === 'string' ? phase : JSON.stringify(phase);
        const match = text.match(/(?:actor|group|APT)[:\s]+([A-Z][a-zA-Z0-9_-]+)/g);
        if (match) {
          for (const m of match) {
            const name = m.replace(/^(?:actor|group|APT)[:\s]+/i, '').trim();
            if (name) actorNames.push(name);
          }
        }
      }
    }

    // Derive techniques from MITRE data in captureSession
    const mitreRaw = cs?.mitre as any;
    const mitreArr = Array.isArray(mitreRaw) ? mitreRaw : (Array.isArray(mitreRaw?.techniques) ? mitreRaw.techniques : []);
    const techniqueIds = mitreArr.map((t: any) => t.id ?? t.techniqueId).filter(Boolean);

    // Create one actor per unique name (deduplicated)
    const unique = [...new Set(actorNames)];
    for (const name of unique) {
      actors.push({
        id: `actor_${name.toLowerCase().replace(/\s+/g, '_')}`,
        name,
        riskLevel: story.severity?.toUpperCase() ?? 'UNKNOWN',
        techniques: techniqueIds,
        description: story.executive_summary ?? undefined,
        campaigns: [],
        iocs: [],
        aliases: [],
        labels: [],
      });
    }
  }

  // 3. If still no actors but MITRE techniques exist, synthesise a generic actor
  if (actors.length === 0 && cs?.mitre) {
    const mitreRaw = cs.mitre as any;
    const mitreArr = Array.isArray(mitreRaw) ? mitreRaw : (Array.isArray(mitreRaw?.techniques) ? mitreRaw.techniques : []);
    if (mitreArr.length > 0) {
      const techniqueIds = mitreArr.map((t: any) => t.id ?? t.techniqueId).filter(Boolean);
      const tactics = [...new Set(mitreArr.map((t: any) => t.tactic).filter(Boolean))];
      actors.push({
        id: 'actor_detected',
        name: 'Detected Threat Actor',
        description: `Threat actor associated with ${techniqueIds.length} detected MITRE ATT&CK technique(s) across tactics: ${tactics.join(', ')}.`,
        riskLevel: 'HIGH',
        techniques: techniqueIds,
        campaigns: [],
        iocs: Array.isArray(cs?.iocs) ? (cs.iocs as any[]).slice(0, 5).map((i: any) => i.value ?? i.asset ?? '').filter(Boolean) : [],
        aliases: [],
        labels: ['inferred'],
      });
    }
  }

  return NextResponse.json({ actors, total: actors.length });
}
