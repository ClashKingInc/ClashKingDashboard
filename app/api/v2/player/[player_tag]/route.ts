import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ player_tag: string }> }
) {
  const { player_tag } = await params;
  return proxyApiRequest(request, `/v2/player/${player_tag}`, { errorMessage: 'Failed to fetch player info' });
}
