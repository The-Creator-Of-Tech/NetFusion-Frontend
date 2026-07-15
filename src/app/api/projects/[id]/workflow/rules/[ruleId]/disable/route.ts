import { NextRequest } from 'next/server';
import { proxyWorkflow } from '../../../_proxy';

interface Params { params: { id: string; ruleId: string } }

export async function POST(req: NextRequest, { params }: Params) {
  return proxyWorkflow(req, params.id);
}
