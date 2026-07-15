import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; giveaway_id: string }> }
) {
  const { server_id, giveaway_id } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/giveaways/${giveaway_id}/reroll`, { errorMessage: 'Failed to reroll giveaway winners' });
}
