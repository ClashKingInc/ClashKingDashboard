import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; player_tag: string }> }
) {
  const { server_id, player_tag } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/strikes/player/${player_tag}/summary`, { errorMessage: 'Failed to fetch player strike summary' });
}
