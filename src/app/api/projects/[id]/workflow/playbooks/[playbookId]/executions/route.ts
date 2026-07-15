import { NextRequest } from 'next/server';
import { proxyWorkflow } from '../../../_proxy';

interface Params { params: { id: string; playbookId: string } }

/**
 * GET /api/projects/:id/workflow/playbooks/:playbookId/executions
 *
 * Proxies to FastAPI:
 *   GET /api/v2/workflow/playbooks/:playbookId/executions
 */
export async function GET(req: NextRequest, { params }: Params) {
  return proxyWorkflow(req, params.id);
}
