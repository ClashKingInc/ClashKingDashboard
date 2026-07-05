import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guild_id: string }> }
) {
  const { guild_id } = await params;
  return proxyApiRequest(request, `/v2/guild/${guild_id}`, { errorMessage: 'Failed to fetch guild' });
}
