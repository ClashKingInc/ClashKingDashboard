import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; role_type: string; role_id: string }> }
) {
  const { server_id, role_type, role_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/roles/${role_type}/${role_id}`, { errorMessage: 'Failed to delete role' });
}
