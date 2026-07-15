import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; player_tag: string }> }
) {
  const { server_id, player_tag } = await params;
  return proxyApiRequest(request, `/v2/ban/remove/${server_id}/${player_tag}`, { errorMessage: 'Failed to remove ban' });
}
