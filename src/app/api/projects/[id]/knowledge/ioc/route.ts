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
      captureSession: { select: { iocs: true } },
    },
  });

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const isOwner = project.ownerId === session.user.id;
  const isMember = project.members.some((m) => m.userId === session.user.id);
  if (!isOwner && !isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Try FastAPI v2 knowledge endpoint first
  try {
    const response = await fetch(`${FASTAPI_URL}/api/v2/knowledge/ioc/?project_id=${params.id}`, {
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
        // Normalise FastAPI field names (iocId → id, iocType → type, etc.)
        const records = rawArr.map((ioc: any) => ({
          id: ioc.iocId ?? ioc.id ?? `ioc_${Math.random()}`,
          value: ioc.value ?? ioc.indicator ?? '',
          type: normaliseIocType(ioc.iocType ?? ioc.type ?? ''),
          reputation: normaliseReputation(ioc.severity),
          confidence: typeof ioc.confidence === 'number' ? ioc.confidence : confidenceLabelToNumber(ioc.confidence),
          source: ioc.source ?? 'Threat Intel',
          status: ioc.revoked ? 'revoked' : 'active',
          description: ioc.description ?? undefined,
          severity: (ioc.severity ?? 'INFO').toUpperCase(),
          matchedRule: ioc.tags || undefined,
          malicious: ioc.malicious ?? undefined,
        }));
        const total = data.metadata?.pagination?.totalItems ?? records.length;
        return NextResponse.json({ records, total });
      }
    }
  } catch {
    // FastAPI unavailable — fall through to captureSession
  }

  // Fallback: read from captureSession stored in Prisma
  const raw = project.captureSession?.iocs;
  let records: any[] = [];
  if (Array.isArray(raw)) {
    // Normalise pcap IOC shape → IocRecord shape expected by the frontend.
    // Pcap findings look like { severity, type: "Plaintext HTTP", description, asset? }
    // The "type" field there is a finding label, not an IocType — use "value" or "asset"
    // as the indicator value and derive the IocType from it.
    records = (raw as any[]).map((ioc: any, i: number) => {
      // The actual indicator value: prefer explicit value/indicator/asset fields
      const indicatorValue =
        ioc.value ?? ioc.indicator ?? ioc.asset ?? ioc.description ?? `indicator_${i}`;

      // Derive IocType from the indicator value first, fall back to type label hints
      const iocType = deriveIocType(indicatorValue, ioc.type);

      return {
        id: ioc.id ?? `ioc_${i}`,
        value: indicatorValue,
        type: iocType,
        reputation: normaliseReputation(ioc.severity),
        confidence: ioc.confidence ?? severityToConfidence(ioc.severity),
        source: ioc.source ?? ioc.matchedRule ?? 'Capture Analysis',
        status: (ioc.status as string) ?? 'active',
        description: ioc.description ?? undefined,
        severity: (ioc.severity ?? 'INFO').toUpperCase(),
        matchedRule: ioc.matchedRule ?? (typeof ioc.type === 'string' ? ioc.type : undefined),
      };
    });
  }

  return NextResponse.json({ records, total: records.length });
}

const VALID_IOC_TYPES = new Set(['ip', 'domain', 'url', 'hash', 'email', 'filename']);

/**
 * Normalise FastAPI iocType values (e.g. "IP", "HASH_MD5", "URL") to valid frontend IocType.
 * Always returns one of: ip | domain | url | hash | email | filename
 */
function normaliseIocType(iocType: string): string {
  const t = (iocType ?? '').toLowerCase();
  if (t === 'ip' || t.startsWith('ip_')) return 'ip';
  if (t === 'url' || t.startsWith('url')) return 'url';
  if (t.includes('hash') || t.startsWith('md5') || t.startsWith('sha')) return 'hash';
  if (t === 'email' || t.includes('email')) return 'email';
  if (t === 'domain' || t.includes('domain') || t.includes('fqdn')) return 'domain';
  if (t === 'filename' || t.includes('file')) return 'filename';
  return 'filename';
}

function confidenceLabelToNumber(label?: string): number {
  const l = (label ?? '').toUpperCase();
  if (l === 'CRITICAL') return 95;
  if (l === 'HIGH') return 80;
  if (l === 'MEDIUM') return 60;
  if (l === 'LOW') return 40;
  return 20;
}

/**
 * Derive a valid IocType from the indicator value and optional type hint.
 * Always returns one of: ip | domain | url | hash | email | filename
 */
function deriveIocType(value: string, typeHint?: string): string {
  // If an explicit valid IocType is already set, use it directly
  if (typeHint && VALID_IOC_TYPES.has(typeHint.toLowerCase())) {
    return typeHint.toLowerCase();
  }

  const v = (value ?? '').trim();

  // Check value shape first
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(v)) return 'ip';
  if (/^https?:\/\//i.test(v)) return 'url';
  if (/^[a-f0-9]{32,64}$/i.test(v)) return 'hash';
  if (/@/.test(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'email';
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(v)) return 'domain';

  // Fall back to type hint keywords
  const hint = (typeHint ?? '').toLowerCase();
  if (hint.includes('ip') || hint.includes('address')) return 'ip';
  if (hint.includes('domain') || hint.includes('dns') || hint.includes('host')) return 'domain';
  if (hint.includes('url') || hint.includes('http') || hint.includes('ftp')) return 'url';
  if (hint.includes('hash') || hint.includes('md5') || hint.includes('sha')) return 'hash';
  if (hint.includes('email') || hint.includes('mail')) return 'email';

  // Default: treat as a filename/identifier
  return 'filename';
}

function normaliseReputation(severity?: string): string {
  const s = (severity ?? '').toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH') return 'malicious';
  if (s === 'MEDIUM') return 'suspicious';
  if (s === 'LOW' || s === 'INFO') return 'benign';
  return 'unknown';
}

function severityToConfidence(severity?: string): number {
  const s = (severity ?? '').toUpperCase();
  if (s === 'CRITICAL') return 95;
  if (s === 'HIGH') return 80;
  if (s === 'MEDIUM') return 60;
  if (s === 'LOW') return 40;
  return 20;
}
