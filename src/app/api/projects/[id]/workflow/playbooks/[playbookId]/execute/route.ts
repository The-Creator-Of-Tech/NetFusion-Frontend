import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { TimelineService } from '@/lib/timeline';
import { proxyWorkflow, buildBackendUrl } from '../../../_proxy';

interface Params { params: { id: string; playbookId: string } }

// POST /api/projects/[id]/workflow/playbooks/[playbookId]/execute
// Forward to FastAPI then record a timeline event so the Timeline page
// immediately shows "Playbook started" without waiting for a poll.
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Clone the request body so we can forward it and also read it
  const bodyText = await req.text();

  // Forward to FastAPI
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

  // On success, record timeline event
  if (upstreamResponse.ok) {
    try {
      const data = JSON.parse(responseText);
      // FastAPI returns the execution/automation object — pull out useful fields
      const executionId: string =
        data?.execution?.id ?? data?.automation?.id ?? data?.id ?? params.playbookId;
      const playbookName: string =
        data?.execution?.name ?? data?.automation?.name ?? data?.name ?? `Playbook ${params.playbookId}`;

      await TimelineService.workflowStarted(
        params.id,
        session.user.id,
        playbookName,
        executionId
      );
    } catch {
      // JSON parse failure or timeline write failure — never crash the caller
    }
  }

  return new NextResponse(responseText, {
    status: upstreamResponse.status,
    headers: { 'Content-Type': contentType },
  });
}
