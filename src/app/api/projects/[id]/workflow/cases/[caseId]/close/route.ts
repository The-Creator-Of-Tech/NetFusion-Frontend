import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { TimelineService } from '@/lib/timeline';
import { buildBackendUrl } from '../../../_proxy';

interface Params { params: { id: string; caseId: string } }

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
    return NextResponse.json({ error: 'Backend unavailable', detail: String(err) }, { status: 502 });
  }

  const contentType = upstreamResponse.headers.get('content-type') ?? 'application/json';
  const responseText = await upstreamResponse.text();

  if (upstreamResponse.ok) {
    try {
      const data = JSON.parse(responseText);
      const caseObj = data?.case ?? data?.case_flow ?? data;
      await TimelineService.caseStatusChanged(
        params.id,
        session.user.id,
        caseObj?.title ?? `Case ${params.caseId}`,
        params.caseId,
        'closed'
      );
    } catch { /* swallow */ }
  }

  return new NextResponse(responseText, {
    status: upstreamResponse.status,
    headers: { 'Content-Type': contentType },
  });
}
