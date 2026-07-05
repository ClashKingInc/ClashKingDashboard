import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clan_tag: string }> }
) {
  const { clan_tag } = await params;
  return proxyApiRequest(request, `/v2/war/${clan_tag}/war-summary`, { errorMessage: 'Failed to fetch war summary' });
}
