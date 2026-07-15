import { NextRequest } from 'next/server';
import { proxyWorkflow } from '../../_proxy';

interface Params { params: { id: string } }

/**
 * GET /api/projects/:id/workflow/playbooks/statistics
 *
 * Proxies to FastAPI:
 *   GET /api/v2/workflow/playbooks/statistics
 */
export async function GET(req: NextRequest, { params }: Params) {
  return proxyWorkflow(req, params.id);
}
