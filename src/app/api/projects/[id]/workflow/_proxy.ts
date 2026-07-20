/**
 * Shared proxy helper for all workflow routes.
 *
 * Every workflow Next.js route is a thin auth-guarded forwarder to the FastAPI
 * backend at NEXT_PUBLIC_AGENT_URL/api/v2/workflow/*.  No schema translation,
 * no Prisma access, no mock data — just forward and return.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const FASTAPI_BASE = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8000';

/**
 * Maps Next.js workflow path segments to their correct FastAPI equivalents.
 * Only the first path segment after /workflow is rewritten; sub-paths are
 * preserved verbatim so dynamic segments (IDs, actions) pass through unchanged.
 *
 * Frontend path segment  →  FastAPI path segment
 * ─────────────────────────────────────────────
 * automations            →  automation
 * cases                  →  case-flow
 */
const WORKFLOW_PATH_REWRITES: Record<string, string> = {
  automations: 'automation',
  cases: 'case-flow',
};

/**
 * Build the backend URL by replacing the Next.js prefix
 * `/api/projects/<id>/workflow/...` with the FastAPI prefix
 * `/api/v2/workflow/...` and appending the original query string.
 *
 * The `projectId` is forwarded as a `project_id` query param so the backend
 * can scope results even on endpoints that don't embed it in the path.
 */
export function buildBackendUrl(req: NextRequest, projectId: string): string {
  const url = new URL(req.url);

  // Strip the Next.js-specific prefix up to and including /workflow
  // e.g. /api/projects/abc/workflow/playbooks/xyz  →  /playbooks/xyz
  const match = url.pathname.match(/\/workflow(\/.*)?$/);
  const workflowPath = match?.[1] ?? '/';

  // Rewrite the first path segment if a mapping exists.
  // e.g. /automations/abc/stop  →  /automation/abc/stop
  //      /cases/xyz/tasks       →  /case-flow/xyz/tasks
  const rewrittenPath = workflowPath.replace(
    /^\/([^/]+)(\/.*)?$/,
    (_, segment, rest = '') => {
      const mapped = WORKFLOW_PATH_REWRITES[segment] ?? segment;
      return `/${mapped}${rest}`;
    },
  );

  // Preserve any existing query params and add project_id
  const qs = new URLSearchParams(url.searchParams);
  if (!qs.has('project_id')) {
    qs.set('project_id', projectId);
  }

  return `${FASTAPI_BASE}/api/v2/workflow${rewrittenPath}?${qs.toString()}`;
}

/**
 * Forward a request to FastAPI and return the response transparently.
 * Auth is verified before calling — returns 401 if no session.
 */
export async function proxyWorkflow(
  req: NextRequest,
  projectId: string,
  init?: RequestInit,
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = buildBackendUrl(req, projectId);

  try {
    const upstream = await fetch(backendUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      // Pass through body for non-GET/HEAD requests
      ...(req.method !== 'GET' && req.method !== 'HEAD'
        ? { body: await req.text() }
        : {}),
      cache: 'no-store',
      ...init,
    });

    // Read the response body as binary (ArrayBuffer) so that binary files
    // (e.g. PCAP captures) are not corrupted by UTF-8 text decoding.
    const body = await upstream.arrayBuffer();

    // Forward Content-Type and Content-Disposition so the browser receives
    // the correct MIME type and uses the server-specified download filename.
    // Without Content-Disposition the browser ignores the artifact name and
    // falls back to the URL path segment ("download"), causing the analysis
    // artifact to be saved with the wrong filename / wrong file entirely.
    const responseHeaders: Record<string, string> = {};
    const contentType = upstream.headers.get('content-type');
    if (contentType) responseHeaders['Content-Type'] = contentType;
    const contentDisposition = upstream.headers.get('content-disposition');
    if (contentDisposition) responseHeaders['Content-Disposition'] = contentDisposition;

    return new NextResponse(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error('[workflow proxy] upstream error:', backendUrl, err);
    return NextResponse.json(
      { error: 'Backend unavailable', detail: String(err) },
      { status: 502 },
    );
  }
}
