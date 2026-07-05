import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function POST(request: NextRequest) {
  return proxyApiRequest(request, `/v2/roster-token`, { errorMessage: 'Failed to generate token' });
}
