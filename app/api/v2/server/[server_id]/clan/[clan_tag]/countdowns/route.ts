import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string; clan_tag: string }> }
) {
  const { server_id, clan_tag } = await params;
  return proxyApiRequest(request, `/v2/server/${server_id}/clan/${clan_tag}/countdowns`, { errorMessage: 'Failed to fetch countdown status' });
}
