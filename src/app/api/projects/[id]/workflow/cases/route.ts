import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { TimelineService } from '@/lib/timeline';
import { proxyWorkflow, buildBackendUrl } from '../_proxy';

interface Params { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  return proxyWorkflow(req, params.id);
}

// POST /api/projects/[id]/workflow/cases — create a case
// Forward to FastAPI then record a timeline event immediately.
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bodyText = await req.text();

  const backendUrl = buildBackendUrl(req, params.id);
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyText,
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[workflow proxy] upstream error:', backendUrl, err);
    return NextResponse.json(
      { error: 'Backend unavailable', detail: String(err) },
      { status: 502 }
    );
  }

  const contentType = upstreamResponse.headers.get('content-type') ?? 'application/json';
  const responseText = await upstreamResponse.text();

  if (upstreamResponse.ok) {
    try {
      const data = JSON.parse(responseText);
      const caseObj = data?.case ?? data?.case_flow ?? data;
      const investigationId: string = caseObj?.id ?? 'unknown';
      const caseTitle: string = caseObj?.title ?? 'Case';
      const priority: string = caseObj?.priority ?? 'medium';

      await TimelineService.caseCreated(
        params.id,
        session.user.id,
        caseTitle,
        investigationId,
        priority
      );
    } catch {
      // Swallow
    }
  }

  return new NextResponse(responseText, {
    status: upstreamResponse.status,
    headers: { 'Content-Type': contentType },
  });
}
