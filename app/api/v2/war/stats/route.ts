import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(request: NextRequest) {
  return proxyApiRequest(request, `/v2/war/clan/stats`, { errorMessage: 'Failed to fetch war stats' });
}
