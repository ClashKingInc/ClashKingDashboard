import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; autoboard_id: string }> }
) {
  const { server_id, autoboard_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/autoboards/${autoboard_id}`, { errorMessage: 'Failed to delete autoboard' });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; autoboard_id: string }> }
) {
  const { server_id, autoboard_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/autoboards/${autoboard_id}`, { errorMessage: 'Failed to update autoboard' });
}
