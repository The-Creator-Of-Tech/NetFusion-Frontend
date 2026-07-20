import { NextRequest } from 'next/server';
import { proxyWorkflow } from '../../../../../_proxy';

interface Params { params: { id: string; executionId: string; artifactId: string } }

export async function POST(req: NextRequest, { params }: Params) {
  return proxyWorkflow(req, params.id);
}
