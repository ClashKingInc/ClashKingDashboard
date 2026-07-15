import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string; itemId: string }> }
) {
  const { category, itemId } = await params;
  return proxyApiRequest(request, `/v2/static/${category}/${encodeURIComponent(itemId)}/maxlevel`, { errorMessage: 'Failed to fetch max level', responseHeaders: { 'Cache-Control': 'public, max-age=3600' } });
}
