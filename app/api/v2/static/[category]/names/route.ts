import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const { category } = await params;
  return proxyApiRequest(request, `/v2/static/${category}/names`, { errorMessage: 'Failed to fetch category names', responseHeaders: { 'Cache-Control': 'public, max-age=3600' } });
}
