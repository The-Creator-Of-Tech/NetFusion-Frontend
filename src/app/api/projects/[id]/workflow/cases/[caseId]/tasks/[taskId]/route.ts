import { NextRequest } from 'next/server';
import { proxyWorkflow } from '../../../../_proxy';

interface Params { params: { id: string; caseId: string; taskId: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  return proxyWorkflow(req, params.id);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return proxyWorkflow(req, params.id);
}
