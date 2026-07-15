import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; player_tag: string }> }
) {
  const { server_id, player_tag } = await params;
  return proxyApiRequest(request, `/v2/ban/add/${server_id}/${player_tag}`, { errorMessage: 'Failed to add ban' });
}
