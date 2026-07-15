import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function POST(request: NextRequest) {
  return proxyApiRequest(request, `/v2/war/war-summary`, { errorMessage: 'Failed to fetch war summaries' });
}
