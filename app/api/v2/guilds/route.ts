import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/api-proxy';

export async function GET(request: NextRequest) {
  return proxyApiRequest(request, `/v2/guilds`, { errorMessage: 'Failed to fetch guilds' });
}
