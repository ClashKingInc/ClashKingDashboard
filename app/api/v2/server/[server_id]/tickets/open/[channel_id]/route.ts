import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; channel_id: string }> }
) {
  const { server_id, channel_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/tickets/open/${channel_id}`, { errorMessage: 'Failed to delete ticket' });
}
