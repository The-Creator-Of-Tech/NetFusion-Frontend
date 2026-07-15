import { NextRequest } from 'next/server';
import { proxyWorkflow } from '../../_proxy';

interface Params { params: { id: string; automationId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  return proxyWorkflow(req, params.id);
}
